import {BigNumber, Contract, ethers, Wallet, utils} from 'ethers';
import type {Env} from './types';
import {contracts, chainId} from './contracts.json';
import {DO} from './DO';
import {
  createErrorResponse,
  DifferentChainIdDetected,
  PaymentAddressChangeDetected,
  TransactionInvalidMissingFields,
  NoReveal,
  AlreadyPending,
  NotEnoughBalance,
  NotRegistered,
  NotAuthorized,
  InvalidNonce,
  NoDelegateRegistered,
  InvalidDelegate,
  InvalidFeesScheduleSubmission,
  AlreadyExistsButDifferent,
} from './errors';
import {xyToLocation, createResponse, time2text, dequals} from './utils';
import { parseEther, parseUnits } from 'ethers/lib/utils';

// const oldFetch = globalThis.fetch;

// function wait(delay) {
//   return new Promise((resolve) => setTimeout(resolve, delay));
// }

// function fetchRetry(url, delay, tries, fetchOptions = {}) {
//   function onError(err) {
//     let triesLeft = tries - 1;
//     if (!triesLeft) {
//       throw err;
//     }
//     return wait(delay).then(() => fetchRetry(url, delay, triesLeft, fetchOptions));
//   }
//   return oldFetch(url, fetchOptions).catch(onError);
// }

// globalThis.fetch = (url, fetchOptions) => fetchRetry(url, 500, 3, fetchOptions);

const {verifyMessage} = utils;

let defaultFinality = 12;
if (chainId === '1337') {
  defaultFinality = 3;
} else if (chainId === '31337') {
  defaultFinality = 2;
}

function isAuthorized(address: string, message: string, signature: string): boolean {
  let addressFromSignature;
  try {
    addressFromSignature = verifyMessage(message, signature);
  } catch (e) {
    return false;
  }
  return address.toLowerCase() == addressFromSignature.toLowerCase();
}

// needed because of : https://github.com/cloudflare/durable-objects-typescript-rollup-esm/issues/3
type State = DurableObjectState & {blockConcurrencyWhile: (func: () => Promise<void>) => void};

type TransactionInfo = {hash: string; nonce: number; broadcastTime: number; maxFeePerGasUsed: string};

// Data sent by frontend to request a reveal transaction to be broadcasted at reveal time (Math.max(arrivalTimeWanted, startTime + minDuration))
// startTime is the expected startTime, could be off if the send transaction is still pending.
// minDuration could technically be computed by backend, but could as well be sent by frontend. Just need to make sure it is accurate
// TODO add sendTXInfo : {hash: string; nonce: number} // so that queue can remove the reveal if that sendTXInfo is never mined.
// - This would work because the secret (And the fleetID, which is the hash) is generated from nonce and if a new tx replace it and is confirmed but the fleetID has not been recorded, we know that that particular fleet is gone forever
// - this would need the sendTxSender address too to compare nonce
type Reveal = {
  player: string;
  fleetSender?: string;
  operator?: string;
  fleetID: string;
  secret: string;
  from: {x: number; y: number};
  to: {x: number; y: number};
  distance: number;
  arrivalTimeWanted: number;
  startTime: number; // this is the expected startTime, needed as sendTx could be pending
  minDuration: number; // could technically recompute it from spaceInfo // TODO ? if so move duration in RevealData type
  gift: boolean;
  specific: string;
  potentialAlliances?: string[];
};

type RevealSubmission = Reveal & {delegate?: string; signature: string; nonceMsTimestamp: number};

type MaxFeesSchedule = [
  {maxFeePerGas: string; delay: number, maxPriorityFeePerGas?: string},
  {maxFeePerGas: string; delay: number, maxPriorityFeePerGas?: string},
  {maxFeePerGas: string; delay: number, maxPriorityFeePerGas?: string}
];

// Data for each account
type AccountData = {
  withdrawalRequest?: {
    timestamp: number;
    amount: string;
  };
  nonceMsTimestamp: number;
  paymentReceived: string; // amount of ETH deposited minus amout used (by mined transactions)
  paymentUsed: string;
  paymentSpending: string; // amount reserved for pending reveals
  delegate?: string; // TODO array or reverse lookup ?
  maxFeesSchedule: MaxFeesSchedule; // an array for of maxFeePerGas to use depending on delay for new reveals
};

// The data store per reveal requested
type RevealData = RevealSubmission & {
  sendConfirmed: boolean; // flag indicating whether the send transaction has been confirmed and startTime is now validated
  retries: number; // whenever the tx is pushed back for later because it cannot be sent (cannot fetch startTime for example, meaning the fleet do not exist)
  maxFeesSchedule: MaxFeesSchedule; // an array for of maxFeePerGas to use depending on delay for this reveal
};

// Data stored when a transaction is broadcasted
type PendingTransactionData = RevealData & {tx: TransactionInfo};

// global index counter to ensure ordering of tx but also ensure their pendingID is unique
type TransactionsCounter = {
  nextIndex: number;
};

type RegistrationSubmission = {
  player: string; // player to register
  delegate: string; // delegate allowed to perform submission on behalf of the player
  nonceMsTimestamp: number; // handy mechanism to push update without the need to fetch nonce first
  signature: string; // signature for the registration data
};

type WithdrawalSubmission = {
  player: string; // player to register
  delegate: string; // delegate allowed to perform submission on behalf of the player
  nonceMsTimestamp: number; // handy mechanism to push update without the need to fetch nonce first
  signature: string; // signature for the registration data
};


type FeeScheduleSubmission = {
  player: string; // player for which we want to update the feeSchedule
  delegate?: string; // submitted by delegate
  maxFeesSchedule: MaxFeesSchedule; // an array for of maxFeePerGas to use depending on delay for new reveals
  nonceMsTimestamp: number; // handy mechanism to push update without the need to fetch nonce first
  signature: string; // signature for the new feeschedule data
};

// Data stored for fleetID to ensure only one fleetID is being queued across the queue.
// it also store the tx info
type ListData = {
  queueID?: string;
  pendingID?: string;
};

type SyncData = {
  blockHash: string;
  blockNumber: number;
  timestamp?: number; // TODO make it non-optional
  paymentContractAddress: string;
};

const gwei = BigNumber.from('1000000000');


function getDefaultMaxFeesSchedule(env: Env): MaxFeesSchedule {
  if (env.NETWORK_NAME === 'zetachain_testnet') {
    return [
      {maxFeePerGas: parseUnits("0.0008", 'gwei').toString(), delay: 0, maxPriorityFeePerGas: parseUnits('0.0008', 'gwei').toString()},
      {maxFeePerGas: parseUnits("0.0016", 'gwei').toString(), delay: 5*60, maxPriorityFeePerGas: parseUnits('0.001', 'gwei').toString()},
      {maxFeePerGas: parseUnits("0.01", 'gwei').toString(), delay: 20*60, maxPriorityFeePerGas: parseUnits('0.002', 'gwei').toString()},
    ];
  } else {
    // the default fee schedule for new user registration
    // const defaultMaxFeesSchedule: MaxFeesSchedule = [
    //   {maxFeePerGas: gwei.mul(15).div(10).toString(), delay: 0},
    //   {maxFeePerGas: gwei.mul(3).toString(), delay: 5*60},
    //   {maxFeePerGas: gwei.mul(6).toString(), delay: 20*60},
    // ];

    return [
      {maxFeePerGas: gwei.mul(58).toString(), delay: 0, maxPriorityFeePerGas: gwei.mul(15).div(10).toString()},
      {maxFeePerGas: gwei.mul(59).toString(), delay: 5*60, maxPriorityFeePerGas: gwei.mul(3).toString()},
      {maxFeePerGas: gwei.mul(60).toString(), delay: 20*60, maxPriorityFeePerGas: gwei.mul(4).toString()},
    ];
    
  }
}

// maximum gas consumed for the reveal tx // TODO check its actual value, as we modify the contract
// TODO specify it as part of the reveal submission (if the system was fully generic, then it make sense to add it)
const revealMaxGasEstimate = BigNumber.from(1000000); // TODO ?

const RETRY_MAX_PERIOD = 1 * 60 * 60; // 1 hour?
function retryPeriod(duration: number): number {
  return Math.min(RETRY_MAX_PERIOD, duration);
}

function lexicographicNumber12(num: number): string {
  return num.toString().padStart(12, '0');
}
function lexicographicNumber8(num: number): string {
  return num.toString().padStart(8, '0');
}

function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function getMaxFeeAllowed(maxFees: MaxFeesSchedule): BigNumber {
  return maxFees.reduce(
    (prev, curr) => (prev.gt(curr.maxFeePerGas) ? prev : BigNumber.from(curr.maxFeePerGas)),
    BigNumber.from(0)
  );
}

function getMaxFeeFromArray(array: MaxFeesSchedule, delay: number): {maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber} {
  let maxFeePerGas = BigNumber.from(array[0].maxFeePerGas);
  let maxPriorityFeePerGas = BigNumber.from(array[0].maxPriorityFeePerGas);
  for (let i = 0; i < array.length; i++) {
    const elem = array[array.length - i - 1];
    if (elem.delay <= delay) {
      return {maxFeePerGas: BigNumber.from(elem.maxFeePerGas), maxPriorityFeePerGas: BigNumber.from(elem.maxPriorityFeePerGas)};
    }
  }
  return {maxFeePerGas, maxPriorityFeePerGas};
}

function checkSubmission(data: RevealSubmission): {errorResponse?: Response; revealData?: RevealSubmission} {
  if (
    data.minDuration &&
    data.secret &&
    data.fleetID &&
    data.to &&
    data.to.x !== undefined &&
    data.to.y !== undefined &&
    data.startTime &&
    data.arrivalTimeWanted !== undefined &&
    data.arrivalTimeWanted >= 0 &&
    data.player &&
    data.distance &&
    data.from &&
    data.from.x !== undefined &&
    data.from.y !== undefined &&
    data.gift !== undefined &&
    data.specific !== undefined &&
    data.signature &&
    data.nonceMsTimestamp
  ) {
    return {revealData: data};
  } else {
  }
}

function checkFeeScheduleSubmission(data: FeeScheduleSubmission): {errorResponse?: Response} {
  if (data.maxFeesSchedule.length === 3 && data.maxFeesSchedule[0].delay === 0) {
    return {};
  } else {
    return {errorResponse: InvalidFeesScheduleSubmission()};
  }
}

export class RevealQueue extends DO {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;
  outerspaceContract: ethers.Contract;
  allianceRegistryContract: ethers.Contract;
  paymentContract: ethers.Contract;
  finality: number;

  constructor(state: State, env: Env) {
    super(state, env);
    this.provider = new ethers.providers.JsonRpcProvider(env.ETHEREUM_NODE);
    this.wallet = new Wallet(this.env.PRIVATE_KEY, this.provider);
    this.outerspaceContract = new Contract(contracts.OuterSpace.address, contracts.OuterSpace.abi, this.wallet);
    this.allianceRegistryContract = new Contract(
      contracts.AllianceRegistry.address,
      contracts.AllianceRegistry.abi,
      this.wallet
    );
    this.paymentContract = new Contract(contracts.PaymentGateway.address, contracts.PaymentGateway.abi, this.wallet);
    this.finality = env.FINALITY ? parseInt(env.FINALITY) : defaultFinality;
  }

  async register(path: string[], registrationSubmission: RegistrationSubmission): Promise<Response> {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    const timestampMs = Math.floor(Date.now());
    const player = registrationSubmission.player.toLowerCase();
    const accountID = `account_${player}`;
    let account = await this.state.storage.get<AccountData | undefined>(accountID);
    if (!account) {
      account = {
        paymentReceived: '0',
        paymentUsed: '0',
        paymentSpending: '0',
        nonceMsTimestamp: 0,
        maxFeesSchedule: defaultMaxFeesSchedule,
      };
    }
    if (
      registrationSubmission.nonceMsTimestamp <= account.nonceMsTimestamp ||
      registrationSubmission.nonceMsTimestamp > timestampMs
    ) {
      return InvalidNonce();
    }
    const authorized = isAuthorized(
      player,
      `conquest-agent-service: register ${registrationSubmission.delegate.toLowerCase()} as delegate for ${player} (nonce: ${
        registrationSubmission.nonceMsTimestamp
      })`,
      registrationSubmission.signature
    );
    // this.info({player, authorized, signature: registrationSubmission.signature});
    if (!authorized) {
      return NotAuthorized();
    }

    account.delegate = registrationSubmission.delegate.toLowerCase();
    account.nonceMsTimestamp = registrationSubmission.nonceMsTimestamp;
    this.state.storage.put<AccountData>(accountID, account);

    return createResponse({success: true});
  }

  async adoptDefaultFeeSubmission(path: string[]): Promise<Response> {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    if (path[1] !== this.env.API_KEY) {
      return createResponse({success: false});
    }

    const player = path[0].toLowerCase();
    const accountID = `account_${player}`;
    let account = await this.state.storage.get<AccountData | undefined>(accountID);
    if (!account) {
      return createResponse({success: true, account: null});
    }

    account.maxFeesSchedule = defaultMaxFeesSchedule;
    this.state.storage.put<AccountData>(accountID, account);

    return createResponse({success: true, account});
  }

  async adoptDefaultFeeSubmissionOnReveal(path: string[]): Promise<Response> {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    if (path[1] !== this.env.API_KEY) {
      return createResponse({success: false});
    }

    const queueID = path[0].toLowerCase() + `}`; // TODO fix that :D
    let reveal = await this.state.storage.get<RevealData | undefined>(queueID);
    if (!reveal) {
      return createResponse({success: true, account: null});
    }

    reveal.maxFeesSchedule = defaultMaxFeesSchedule;
    this.state.storage.put<RevealData>(queueID, reveal);

    return createResponse({success: true, reveal});
  }

  async setMaxFeePerGasSchedule(path: string, feeScheduleSubmission: FeeScheduleSubmission): Promise<Response> {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    const {errorResponse} = checkFeeScheduleSubmission(feeScheduleSubmission);
    if (errorResponse) {
      return errorResponse;
    }

    const timestampMs = Math.floor(Date.now());
    const player = feeScheduleSubmission.player.toLowerCase();
    const accountID = `account_${player}`;
    let account = await this.state.storage.get<AccountData | undefined>(accountID);
    if (!account) {
      account = {
        paymentReceived: '0',
        paymentUsed: '0',
        paymentSpending: '0',
        nonceMsTimestamp: 0,
        maxFeesSchedule: defaultMaxFeesSchedule,
      };
    }
    if (
      feeScheduleSubmission.nonceMsTimestamp <= account.nonceMsTimestamp ||
      feeScheduleSubmission.nonceMsTimestamp > timestampMs
    ) {
      return InvalidNonce();
    }

    if (feeScheduleSubmission.delegate) {
      if (!account.delegate) {
        return NoDelegateRegistered();
      }
      if (feeScheduleSubmission.delegate.toLowerCase() !== account.delegate.toLowerCase()) {
        return InvalidDelegate();
      }
    }

    const feesScheduleString = feeScheduleSubmission.maxFeesSchedule
      .map((v) => '' + v.delay + ':' + v.maxFeePerGas + ':')
      .join(',');
    const scheduleMessageString = `setMaxFeePerGasSchedule:${player}:${feesScheduleString}:${feeScheduleSubmission.nonceMsTimestamp}`;
    const authorized = isAuthorized(
      feeScheduleSubmission.delegate ? account.delegate : player,
      scheduleMessageString,
      feeScheduleSubmission.signature
    );
    this.info({
      scheduleMessageString,
      player,
      delegate: account.delegate,
      authorized,
      signature: feeScheduleSubmission.signature,
    });
    if (!authorized) {
      return NotAuthorized();
    }

    account.maxFeesSchedule = feeScheduleSubmission.maxFeesSchedule;
    this.state.storage.put<AccountData>(accountID, account);

    return createResponse({success: true});
  }

  async queueReveal(path: string[], revealSubmission: RevealSubmission): Promise<Response> {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    // if (path || !path) {
    //   return createErrorResponse({code: 4999, message: 'reject'});
    // }
    const {errorResponse, revealData} = checkSubmission(revealSubmission);
    if (errorResponse) {
      return errorResponse;
    } else if (!revealData) {
      return NoReveal();
    }

    const timestampMs = Math.floor(Date.now());
    const timestamp = Math.floor(timestampMs / 1000);

    const accountID = `account_${revealSubmission.player.toLowerCase()}`;
    let account = await this.state.storage.get<AccountData | undefined>(accountID);
    if (!account) {
      account = {
        paymentReceived: '0',
        paymentUsed: '0',
        paymentSpending: '0',
        nonceMsTimestamp: 0,
        maxFeesSchedule: defaultMaxFeesSchedule
      };
    }
    const maxFeeAllowed = getMaxFeeAllowed(account.maxFeesSchedule);
    const minimumCost = maxFeeAllowed.mul(revealMaxGasEstimate);
    const minimumBalance = minimumCost.sub(parseEther('1'));
    const reveal = {...revealData, retries: 0, sendConfirmed: false, maxFeesSchedule: account.maxFeesSchedule};

    if (
      revealSubmission.nonceMsTimestamp <= account.nonceMsTimestamp ||
      revealSubmission.nonceMsTimestamp > timestampMs
    ) {
      return InvalidNonce();
    }

    if (revealSubmission.delegate) {
      if (!account.delegate) {
        return NoDelegateRegistered();
      }
      if (revealSubmission.delegate.toLowerCase() !== account.delegate.toLowerCase()) {
        return InvalidDelegate();
      }
    }

    const {player, fleetID, secret, from, to, distance, startTime, arrivalTimeWanted, minDuration, gift, specific, potentialAlliances} =
      revealSubmission;

    const queueMessageString = `queue:${player}:${fleetID}:${secret}:${from.x}:${from.y}:${to.x}:${
      to.y
    }:${distance}:${gift}:${specific}:${
      potentialAlliances ? potentialAlliances.join(',') : ''
    }:${startTime}:${minDuration}:${arrivalTimeWanted}:${revealSubmission.nonceMsTimestamp}`;
    const authorized = isAuthorized(
      revealSubmission.delegate ? account.delegate : player,
      queueMessageString,
      revealSubmission.signature
    );
    this.info({
      queueMessageString,
      player,
      delegate: account.delegate,
      authorized,
      signature: revealSubmission.signature,
    });
    if (!authorized) {
      return NotAuthorized();
    }

    let balance = BigNumber.from(account.paymentReceived).sub(BigNumber.from(account.paymentUsed).add(account.paymentSpending));

    if (account.withdrawalRequest && timestamp < account.withdrawalRequest.timestamp + contracts.PaymentWithdrawalGateway.linkedData.expiryInSeconds + contracts.PaymentWithdrawalGateway.linkedData.extraIntervalInSeconds) {
      balance = balance.sub(account.withdrawalRequest.amount);
    }

    if (balance.lt(minimumBalance)) {
      //|| !account.delegate) {
      balance = await this._fetchExtraBalanceFromLogs(balance, player.toLowerCase());
      if (balance.lt(minimumBalance)) {
        return NotEnoughBalance();
      }
    }

    const revealID = `l_${reveal.fleetID}`;
    const broadcastingTime = Math.max(reveal.arrivalTimeWanted, reveal.startTime + reveal.minDuration);
    const queueID = `q_${lexicographicNumber12(broadcastingTime)}_${reveal.fleetID}}`;

    const exitsitngReveal = await this.state.storage.get<RevealData | undefined>(queueID);
    if (exitsitngReveal) {
      try {
        if (dequals(exitsitngReveal, reveal)) {
          this.info(`existing is same : ${queueID}`);
          return createResponse({queueID});
        } else {
          this.error(`existing is different : ${queueID}`);
          return AlreadyExistsButDifferent();
        }
      } catch(e) {
        const message = `existing queueID (${queueID}) : failed with ${e}`;
        this.error(message);
        return createErrorResponse({message, code: 5001});
      }
    }

    const existing = await this.state.storage.get<ListData | undefined>(revealID);
    if (existing) {
      if (existing.pendingID) {
        // TODO what should we do here, for now reject
        // the transaction is already on its way and unless the initial data was wrong, the tx is going to go through and succeed (if sent/mined in time)
        // could add a FORCE option ?
        return AlreadyPending();
      } else if (!existing.queueID) {
        // impossible
      } else if (queueID != existing.queueID) {
        this.state.storage.delete(existing.queueID);
        // this.state.storage.delete(revealID); // no need as it will be overwritten below
      }
    }

    let accountRefected = await this.state.storage.get<AccountData | undefined>(accountID);
    if (!accountRefected) {
      accountRefected = {
        paymentReceived: '0',
        paymentUsed: '0',
        paymentSpending: '0',
        nonceMsTimestamp: 0,
        maxFeesSchedule: defaultMaxFeesSchedule
      };
    }
    const paymentSpending = BigNumber.from(accountRefected.paymentSpending).add(minimumCost);
    accountRefected.paymentSpending = paymentSpending.toString();

    this.state.storage.put<AccountData>(accountID, accountRefected);
    this.state.storage.put<RevealData>(queueID, reveal);
    this.state.storage.put<ListData>(revealID, {queueID});
    return createResponse({queueID});
  }

  async execute(path: string[]): Promise<Response> {
    const timestamp = getTimestamp();
    // TODO test limit, is 10 good enough ? this will depends on exec time and CRON period and number of tx submitted
    const limit = 10;
    const reveals = (await this.state.storage.list({prefix: `q_`, limit})) as Map<string, RevealData> | undefined;
    if (reveals) {
      for (const revealEntry of reveals.entries()) {
        const reveal = revealEntry[1];
        const queueID = revealEntry[0];
        const revealTime = Math.max(reveal.arrivalTimeWanted, reveal.startTime + reveal.minDuration);

        // TODO finalyty * blockTime
        if (timestamp > revealTime + contracts.OuterSpace.linkedData.resolveWindow + this.finality * 15) {
          this.info(`too late, deleting ${queueID}...`);
          const revealID = `l_${reveal.fleetID}`;
          this.state.storage.delete(queueID);
          this.state.storage.delete(revealID);
        } else if (revealTime <= timestamp) {
          this.info(`executing ${queueID}...`);
          await this._executeReveal(queueID, reveal);
        } else {
          this.info(
            `skip reveal (${queueID}) because not yet time (Math.max(${reveal.arrivalTimeWanted}, ${reveal.startTime} + ${reveal.minDuration}) = ${revealTime}) > ${timestamp}`
          );
        }
      }
    }
    return createResponse({success: true});
  }

  async checkPendingTransactions(path: string[]): Promise<Response> {
    // TODO test limit, is 10 good enough ? this will depends on exec time and CRON period and number of tx submitted
    const limit = 10;
    const txs = (await this.state.storage.list({prefix: `pending_`, limit})) as
      | Map<string, PendingTransactionData>
      | undefined;
    if (txs) {
      for (const txEntry of txs.entries()) {
        const pendingID = txEntry[0];
        const pendingReveal = txEntry[1];
        await this._checkPendingTransaction(pendingID, pendingReveal);
        // TODO check pending transactions, remove confirmed one, increase gas if queue not moving
        // nonce can be rebalanced too if needed ?
      }
    }
    return createResponse({success: true});
  }

  async deleteAll(path: string[]): Promise<Response> {
    if (path[0] === this.env.API_KEY) {
      this.state.storage.deleteAll();
      return createResponse({success: true});
    } else {
      this.state.storage.deleteAll();
      return createResponse({success: false});
    }
  }

  async account(path: string[]): Promise<Response> {
    const timestampMs = Math.floor(Date.now());
    const timestamp = Math.floor(timestampMs / 1000);
    const player = path[0]?.toLowerCase();
    const accountID = `account_${player}`;
    const accountData = await this.state.storage.get<AccountData | undefined>(accountID);
    if (accountData) {
      const maxFeeAllowed = getMaxFeeAllowed(accountData.maxFeesSchedule);
      const minimumCost = maxFeeAllowed.mul(revealMaxGasEstimate);
      const minimumBalance = minimumCost.sub(parseEther('1'));
      let balance = BigNumber.from(accountData.paymentReceived).sub(BigNumber.from(accountData.paymentUsed).add(accountData.paymentSpending));

      // if (balance.lt(minimumBalance)) {
        balance = await this._fetchExtraBalanceFromLogs(balance, player);
      // }

      if (accountData.withdrawalRequest && timestamp < accountData.withdrawalRequest.timestamp + contracts.PaymentWithdrawalGateway.linkedData.expiryInSeconds + contracts.PaymentWithdrawalGateway.linkedData.extraIntervalInSeconds) {
        balance = balance.sub(accountData.withdrawalRequest.amount);
      }

      return createResponse({
        account: {
          ...accountData,
          balance: balance.toString(),
          requireTopUp: balance.lt(minimumBalance),
          minimumBalance: minimumBalance.toString(),
        },
      });
    }
    return createResponse({account: null});
  }

  async getTransactionInfo(path: string[]): Promise<Response> {
    const revealID = `l_${path[0]}`;
    const listData = await this.state.storage.get<ListData | undefined>(revealID);
    if (listData && listData.pendingID) {
      const pendingTransaction = await this.state.storage.get<PendingTransactionData | undefined>(listData.pendingID);
      if (pendingTransaction) {
        return createResponse({tx: pendingTransaction.tx});
      }
    }
    return createResponse({tx: null});
  }

  async getPendingTransactions(path: string[]): Promise<Response> {
    const limit = 1000;
    const txEntries = (await this.state.storage.list({prefix: `pending_`, limit})) as
      | Map<string, PendingTransactionData>
      | undefined;
    const txs = {};
    if (txEntries) {
      for (const txEntry of txEntries.entries()) {
        const tx = txEntry[1];
        const txID = txEntry[0];
        txs[txID] = tx;
      }
    }

    return createResponse({txs, success: true});
  }

  // TODO admin
  // async deleteFromQueue(path: string[]): Promise<Response> {
  //   const reveal = (await this.state.storage.get(path[0])) as RevealData;
  //   const listID = `l_${reveal.fleetID}`;
  //   const listData = (await this.state.storage.get(listID)) as ListData;
  //   if (listData) {
  //     if (listData.pendingID) {
  //       this.state.storage.delete(listData.pendingID);
  //     }
  //     this.state.storage.delete(listID);
  //   }
  //   this.state.storage.delete(path[0]);

  //   return createResponse({success: true});
  // }

  async getQueue(path: string[]): Promise<Response> {
    const limit = 1000;
    const reveals = (await this.state.storage.list({prefix: `q_`, limit})) as Map<string, RevealData> | undefined;
    const queue = {};
    if (reveals) {
      for (const revealEntry of reveals.entries()) {
        const reveal = revealEntry[1];
        const queueID = revealEntry[0];
        queue[queueID] = {
          fleetID: reveal.fleetID,
          from: reveal.from,
          player: reveal.player,
          retries: reveal.retries,
          startTime: reveal.startTime,
          sendConfirmed: reveal.sendConfirmed,
          // secretHash: reveal.secret,
        };
      }
    }

    return createResponse({queue, success: true});
  }

  async getQueueAsSortedArray(path: string[]): Promise<Response> {
    if (path[0] !== this.env.API_KEY) {
      return createResponse({success: false});
    }
    const limit = 1000;
    const reveals = (await this.state.storage.list({prefix: `q_`, limit})) as Map<string, RevealData> | undefined;
    const queue = [];
    if (reveals) {
      for (const revealEntry of reveals.entries()) {
        const reveal = revealEntry[1];
        const queueID = revealEntry[0];
        queue.push({
          queueID,
          fleetID: reveal.fleetID,
          from: reveal.from,
          to: reveal.to,
          player: reveal.player,
          retries: reveal.retries,
          startTime: reveal.startTime,
          sendConfirmed: reveal.sendConfirmed,
          minDuration: reveal.minDuration,
          revealTime: Math.max(reveal.arrivalTimeWanted, reveal.startTime + reveal.minDuration),
          fleetSender: reveal.fleetSender,
          operator: reveal.operator,
          distance: reveal.distance,
          gift: reveal.gift,
          specific: reveal.specific,
          potentialAlliances: reveal.potentialAlliances,
          maxFeesSchedule: reveal.maxFeesSchedule,
          arrivalTimeWanted: reveal.arrivalTimeWanted
          // secretHash: reveal.secret,
        });
      }
    }

    return createResponse({
      queue: queue
        .sort((a, b) => a.revealTime - b.revealTime)
        .map((v) => {
          v.revealTime = new Date(v.revealTime * 1000).toUTCString();
          v.startTime = new Date(v.startTime * 1000).toUTCString();
          v.minDuration = time2text(v.minDuration);
          v.arrivalTimeWanted = new Date(v.arrivalTimeWanted * 1000).toUTCString();
          return v;
        }),
      success: true,
    });
  }

  async getRevealList(path: string[]): Promise<Response> {
    const limit = 1000;
    const listDatas = (await this.state.storage.list({prefix: `l_`, limit})) as Map<string, ListData> | undefined;
    const list = {};
    if (listDatas) {
      for (const listEntry of listDatas.entries()) {
        const listData = listEntry[1];
        const lID = listEntry[0];
        list[lID] = {
          queueID: listData.queueID,
          pendingID: listData.pendingID,
        };
      }
    }

    return createResponse({list, success: true});
  }

  // async test(path: string[]): Promise<Response> {
  //   const provider = new ethers.providers.JsonRpcProvider(this.env.ETHEREUM_NODE);
  //   const wallet = new Wallet(this.env.PRIVATE_KEY, provider);
  //   const outerspaceContract = new Contract(contracts.OuterSpace.address, contracts.OuterSpace.abi, wallet);

  //   // const test = await outerspaceContract.balanceToWithdraw('0x0000000000000000000000000000000000000000');

  //   return createResponse({test: 'no', node: this.env.ETHEREUM_NODE});
  // }

  async testChainId(path: string[]): Promise<Response> {
    const request = {
      method: 'eth_chainId',
      params: [],
      id: 1,
      jsonrpc: '2.0',
    };
    const response = await fetch(this.env.ETHEREUM_NODE, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    });
    return createResponse({response: await response.json()});
  }

  async testBlockNumber(path: string[]): Promise<Response> {
    return createResponse({response: await this._getBlockNumber()});
  }

  async _getBlockNumber(): Promise<any> {
    const request = {
      method: 'eth_blockNumber',
      params: [],
      id: 1,
      jsonrpc: '2.0',
    };
    const response = await fetch(this.env.ETHEREUM_NODE, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    });
    return response.json();
  }

  async getSyncState(path: string[]): Promise<Response> {
    let lastSync = await this.state.storage.get<SyncData | undefined>('sync');
    if (!lastSync) {
      lastSync = {
        blockNumber: 0,
        blockHash: '',
        paymentContractAddress: this.paymentContract.address,
        timestamp: 0,
      };
    }
    return createResponse({lastSync});
  }

  async setSyncState(path: string[]): Promise<Response> {
    if (path[0] !== this.env.API_KEY) {
      return createResponse({success: false});
    }
    let lastSync = await this.state.storage.get<SyncData | undefined>('sync');
    if (!lastSync) {
      lastSync = {blockNumber: 0, blockHash: '', paymentContractAddress: this.paymentContract.address, timestamp: 0};
    }
    if (path[1] && !isNaN(parseInt(path[1]))) {
      lastSync.blockNumber = parseInt(path[1]);
      // TODO set timestamp ?
    }
    await this.state.storage.put<SyncData>('sync', lastSync);
    return createResponse({lastSync});
  }

  async syncAccountBalances(path: string[]): Promise<Response> {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    const network = await this.provider.getNetwork();
    if (network.chainId.toString() !== chainId) {
      this.error(`Different chainId detected : ${network.chainId} vs expected ${chainId}`);
      return DifferentChainIdDetected();
    }
    const bRes = await this._getBlockNumber();
    this.info(`block number from node ${this.env.ETHEREUM_NODE} is ${BigNumber.from(bRes.result).toNumber()}`);
    const currentBlockNumber = await this.provider.getBlockNumber();
    this.info(`syncAccountBalances currentBlockNumber:${currentBlockNumber} (${this.env.ETHEREUM_NODE})`);
    const toBlockNumber = Math.max(0, currentBlockNumber - this.finality);
    const toBlockObject = await this.provider.getBlock(toBlockNumber);
    // const toBlock = toBlockObject.hash;

    let lastSync = await this.state.storage.get<SyncData | undefined>('sync');
    if (!lastSync) {
      lastSync = {blockNumber: 0, blockHash: '', paymentContractAddress: this.paymentContract.address, timestamp: 0};
    }
    if (!lastSync.paymentContractAddress) {
      lastSync.paymentContractAddress = this.paymentContract.address;
    }

    if (lastSync.paymentContractAddress !== this.paymentContract.address) {
      this.error(
        `new payment contract dectect : ${this.paymentContract.address} vs last registered: ${lastSync.paymentContractAddress}`
      );
      return PaymentAddressChangeDetected();
    }

    this.info(`lastSync: ${lastSync.blockNumber}`);

    // if there is no new block, no point processing, this will just handle reorg for no benefit
    if (toBlockNumber <= lastSync.blockNumber) {
      this.info(`no new block to fetch`);
      return createResponse('no new block to fetch'); // TODO ?
    }

    if (lastSync.timestamp) {
      // TODO use // blockTIme
      const timeDiff = getTimestamp() - lastSync.timestamp;
      // TODO // 100,000 just to make it safe
      if (toBlockNumber - lastSync.blockNumber > 100000000 + Math.floor(timeDiff / 15)) {
        this.error(
          `jumping of block number, from  ${lastSync.blockNumber} to ${toBlockNumber} in ${time2text(timeDiff)}`
        );

        const bRes = await this._getBlockNumber();
        this.info(`block from node ${this.env.ETHEREUM_NODE} is ${BigNumber.from(bRes.result).toNumber()}`);
        return createResponse(`jumping of block number, from  ${lastSync.blockNumber} to ${toBlockNumber} in ${time2text(timeDiff)}`); // TODO ?
      }
    }

    const fromBlockNumber = lastSync.blockNumber + 1;

    const accountsToUpdate: {[account: string]: {balanceUpdate: BigNumber, withdrawalRequestRemoval?: boolean}} = {};
    const events = await this.paymentContract.queryFilter(
      this.paymentContract.filters.Payment(),
      fromBlockNumber,
      toBlockNumber
    );

    this.info(`found ${events.length} events`);
    for (const event of events) {
      if (event.removed) {
        continue; //ignore removed
      }
      if (event.args) {
        // this.info(event.args);
        const payer = event.args.payer.toLowerCase();
        const accountUpdate = (accountsToUpdate[payer] = accountsToUpdate[payer] || {balanceUpdate: BigNumber.from(0)});
        if (event.args.refund) {
          accountUpdate.balanceUpdate = accountUpdate.balanceUpdate.sub(event.args.amount);
          accountUpdate.withdrawalRequestRemoval = true;
          // remove it based on timestamp // or id ?
        } else {
          // if (event.args.setDelegate.toLowerCase() !== "0x0000000000000000000000000000000000000000") {
          //     account.delegate = event.args.setDelegate.toLowerCase();
          // }
          accountUpdate.balanceUpdate = accountUpdate.balanceUpdate.add(event.args.amount);
        }
      }
    }
    let lastSyncRefetched = await this.state.storage.get<SyncData | undefined>('sync');
    if (!lastSyncRefetched) {
      lastSyncRefetched = {
        blockHash: '',
        blockNumber: 0,
        paymentContractAddress: this.paymentContract.address,
        timestamp: 0,
      };
    }
    if (!lastSyncRefetched.paymentContractAddress) {
      lastSyncRefetched.paymentContractAddress = this.paymentContract.address;
    }
    if (lastSyncRefetched.blockHash !== lastSync.blockHash) {
      // this.info(`got already updated ?`)
      return createResponse(`got already updated ?`); // TODO ?
    }

    const accountAddresses = Object.keys(accountsToUpdate);
    for (const accountAddress of accountAddresses) {
      const accountUpdate = accountsToUpdate[accountAddress];
      let currentAccountState = await this.state.storage.get<AccountData | undefined>(`account_${accountAddress}`);
      if (!currentAccountState) {
        currentAccountState = {
          paymentReceived: '0',
          paymentUsed: '0',
          paymentSpending: '0',
          nonceMsTimestamp: 0,
          maxFeesSchedule: defaultMaxFeesSchedule
        };
      }
      this.state.storage.put<AccountData>(`account_${accountAddress}`, {
        paymentReceived: accountUpdate.balanceUpdate.add(currentAccountState.paymentReceived).toString(),
        paymentUsed: currentAccountState.paymentUsed, // TODO
        paymentSpending: currentAccountState.paymentSpending,
        nonceMsTimestamp: currentAccountState.nonceMsTimestamp,
        delegate: currentAccountState.delegate,
        maxFeesSchedule: currentAccountState.maxFeesSchedule,
        withdrawalRequest: accountUpdate.withdrawalRequestRemoval ? undefined: currentAccountState.withdrawalRequest
      });
      this.info(`${accountAddress} updated...`);
    }
    lastSyncRefetched.blockHash = toBlockObject.hash;
    lastSyncRefetched.blockNumber = toBlockNumber;
    lastSyncRefetched.timestamp = toBlockObject.timestamp;
    this.state.storage.put<SyncData>('sync', lastSyncRefetched);

    // this.info({lastSyncRefetched});
    return createResponse({success: true});
  }


  async requestWithdrawal(path: string[], withdrawalSubmission: WithdrawalSubmission): Promise<Response> {
    const timestampMs = Math.floor(Date.now());
    const timestamp = Math.floor(timestampMs / 1000);

    const accountID = `account_${withdrawalSubmission.player.toLowerCase()}`;
    let account = await this.state.storage.get<AccountData | undefined>(accountID);

    if (account) {
      if (
        withdrawalSubmission.nonceMsTimestamp <= account.nonceMsTimestamp ||
        withdrawalSubmission.nonceMsTimestamp > timestampMs
      ) {
        return InvalidNonce();
      }

      if (withdrawalSubmission.delegate) {
        if (!account.delegate) {
          return NoDelegateRegistered();
        }
        if (withdrawalSubmission.delegate.toLowerCase() !== account.delegate.toLowerCase()) {
          return InvalidDelegate();
        }
      }

      const {player} = withdrawalSubmission;

      const withdrawMessageString = `withdraw:${player}:${withdrawalSubmission.nonceMsTimestamp}`;
      const authorized = isAuthorized(
        withdrawalSubmission.delegate ? account.delegate : player,
        withdrawMessageString,
        withdrawalSubmission.signature
      );
      this.info({
        withdrawMessageString,
        player,
        delegate: account.delegate,
        authorized,
        signature: withdrawalSubmission.signature,
      });
      if (!authorized) {
        return NotAuthorized();
      }

      let balance = BigNumber.from(account.paymentReceived).sub(BigNumber.from(account.paymentUsed).add(account.paymentSpending));
      // mo fetch logs as we want to only allow withdrawal for what is final

      account.withdrawalRequest = {
        amount: balance.toString(),
        timestamp
      }

      const data = ethers.utils.defaultAbiCoder.encode([ "uint256", "address", "uint256" ], [ timestamp, player, balance ]);
      const dataHash = ethers.utils.keccak256(data);
      const signature = await this.wallet.signMessage(ethers.utils.arrayify(dataHash));

      return createResponse({
        signature,
        player: withdrawalSubmission.player,
        amount: account.withdrawalRequest.amount,
        timestamp : account.withdrawalRequest.timestamp
      });
    }
    return NotRegistered()
  }

  private async _fetchExtraBalanceFromLogs(balance: BigNumber, player: string): Promise<BigNumber> {
    let lastSync = await this.state.storage.get<SyncData | undefined>('sync');
    if (!lastSync) {
      lastSync = {
        blockNumber: 0,
        blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        paymentContractAddress: this.paymentContract.address,
        timestamp: 0,
      };
    }
    if (!lastSync.paymentContractAddress) {
      lastSync.paymentContractAddress = this.paymentContract.address;
    }

    if (lastSync.paymentContractAddress !== this.paymentContract.address) {
      this.error(
        `new payment contract dectect : ${this.paymentContract.address} vs last registered: ${lastSync.paymentContractAddress}`
      );
      throw new Error(
        `new payment contract dectect : ${this.paymentContract.address} vs last registered: ${lastSync.paymentContractAddress}`
      );
    }

    // fetch latest events; (not finalized)
    const filter = this.paymentContract.filters.Payment(player);
    const recentEvents = await this.paymentContract.queryFilter(filter, lastSync.blockNumber, 'latest');
    for (const event of recentEvents) {
      if (event.args) {
        if (event.args.refund) {
          balance = balance.sub(event.args.amount);
        } else {
          balance = balance.add(event.args.amount);
        }
      }
    }
    return balance;
  }

  private async _executeReveal(queueID: string, reveal: RevealData) {
    const maxFeeAllowed = getMaxFeeAllowed(reveal.maxFeesSchedule);
    const minimumCost = maxFeeAllowed.mul(revealMaxGasEstimate);
    const minimumBalance = minimumCost.sub(parseEther('1'));
    const account = await this.state.storage.get<AccountData | undefined>(`account_${reveal.player}`);
    if (!account) {
      this.info(`no account registered for ${reveal.player}`);
      return;
    }

    let balanceWithoutConsideringPending = BigNumber.from(account.paymentReceived).sub(BigNumber.from(account.paymentUsed));
    if (BigNumber.from(balanceWithoutConsideringPending).lt(minimumCost)) {

      if (BigNumber.from(balanceWithoutConsideringPending).lt(minimumBalance)) {
        this.info(`not enough fund for ${reveal.player}`);
        // TODO return ?
      } else {
        this.info(`paying for ${reveal.player}`);
      }
    }

    const revealID = `l_${reveal.fleetID}`;
    const timestamp = getTimestamp();
    let change = false;
    if (!reveal.sendConfirmed) {
      this.info('fetching startTime...');
      // TODO use reveal.sendTxHash will aloow to get confirmations, need to check if fleet exist
      const actualStartTime = await this._fetchStartTime(reveal);
      // refetch queueID in case it was deleted / moved
      const revealRefetched = await this.state.storage.get<RevealData | undefined>(queueID);
      if (!revealRefetched) {
        return;
      } else {
        reveal = revealRefetched;
      }

      if (!actualStartTime) {
        this.info(`fleet not found :  ${reveal.fleetID}`);
        // not found
        reveal.startTime = timestamp + retryPeriod(reveal.minDuration);
        reveal.retries++;
        if (reveal.retries >= 10) {
          this.info(`deleting reveal ${revealID} after ${reveal.retries} retries ...`);
          await this._reduceSpending(reveal);
          this.state.storage.delete(queueID);
          this.state.storage.delete(revealID);
          return;
        }
        change = true;
      } else {
        reveal.sendConfirmed = true;
        reveal.startTime = actualStartTime;
        // change = true;
        this.state.storage.put<RevealData>(queueID, reveal); //TODO check race condition?
      }
    }

    const newBroadcastingTime = Math.max(reveal.arrivalTimeWanted, reveal.startTime + reveal.minDuration);
    const newQueueID = `q_${lexicographicNumber12(newBroadcastingTime)}_${reveal.fleetID}`;
    if (reveal.sendConfirmed) {
      if (newBroadcastingTime <= timestamp) {
        let transactionsCounter = await this.state.storage.get<TransactionsCounter | undefined>(`pending`);
        if (!transactionsCounter) {
          const transactionCount = await this.wallet.getTransactionCount();
          transactionsCounter = await this.state.storage.get<TransactionsCounter | undefined>(`pending`);
          if (!transactionsCounter) {
            transactionsCounter = {nextIndex: transactionCount}; // ensure no duplicate id in the bucket even if exact same boradcastingTime
            await this.state.storage.put<TransactionsCounter>('pending', transactionsCounter);
          }
        }

        const currentMaxFee = getMaxFeeFromArray(reveal.maxFeesSchedule, timestamp - newBroadcastingTime);

        const {tx, error} = await this._submitTransaction(reveal, {
          expectedNonce: transactionsCounter.nextIndex,
          maxFeePerGas: currentMaxFee.maxFeePerGas,
          maxPriorityFeePerGas: currentMaxFee.maxPriorityFeePerGas
        }); // first save before broadcast ? // or catch "tx already submitted error"
        if (error) {
          if (error.code === 5502) {
            reveal.retries++;
            if (reveal.retries >= 10) {
              this.info(`deleting reveal ${revealID} after 10 retires: due to error code 5502....`);
              await this._reduceSpending(reveal);
              this.state.storage.delete(queueID);
              this.state.storage.delete(revealID);
            }
          } else {
            this.error(error);
          }
          return;
        } else if (!tx) {
          // impossible
          return;
        }
        const listData = await this.state.storage.get<ListData | undefined>(revealID);
        if (!listData) {
          // TODO what to do here. this should not happen
          return;
        }
        if (listData.pendingID) {
          // Already pending
          // TODO what to do here ?
        } else if (listData.queueID) {
          queueID = listData.queueID;
        }

        // TODO
        // transactionCounter should not be changed in between
        // if it was, one tx would override another
        // we could save both somehow?
        // should not happen as the only submitter is the CRON job, leave it for now

        const pendingID = `pending_${lexicographicNumber8(transactionsCounter.nextIndex)}`;
        this.state.storage.put<ListData>(revealID, {pendingID});
        this.state.storage.put<PendingTransactionData>(pendingID, {...reveal, tx});

        transactionsCounter.nextIndex = tx.nonce + 1;
        await this.state.storage.put<TransactionsCounter>(`pending`, transactionsCounter);
        await this.state.storage.delete(queueID);
      } else {
        if (change) {
          if (newQueueID !== queueID) {
            this.state.storage.delete(queueID);
            this.state.storage.put<RevealData>(newQueueID, reveal);
          } else {
            this.state.storage.put<RevealData>(queueID, reveal);
          }
        }
      }
    } else {
      if (newQueueID !== queueID) {
        this.state.storage.delete(queueID);
        this.state.storage.put<RevealData>(newQueueID, reveal);
      } else {
        this.state.storage.put<RevealData>(queueID, reveal);
      }
    }
  }

  async _reduceSpending(reveal: RevealData) {
    const defaultMaxFeesSchedule = getDefaultMaxFeesSchedule(this.env);
    const accountID = `account_${reveal.player}`;
    const maxFeeAllowed = getMaxFeeAllowed(reveal.maxFeesSchedule);
    const minimumCost = maxFeeAllowed.mul(revealMaxGasEstimate);
    // const minimumBalance = minimumCost.sub(parseEther('1'));
    let accountRefetched = await this.state.storage.get<AccountData | undefined>(accountID);
    if (!accountRefetched) {
      accountRefetched = {paymentReceived: '0', paymentUsed: '0', paymentSpending: '0', nonceMsTimestamp: 0, maxFeesSchedule: defaultMaxFeesSchedule};
    }
    let paymentSpending = BigNumber.from(accountRefetched.paymentSpending);
    if (paymentSpending.lt(minimumCost)) {
      paymentSpending = BigNumber.from(0);
    } else {
      paymentSpending = paymentSpending.sub(minimumCost);
    }
    accountRefetched.paymentSpending = paymentSpending.toString();
    this.state.storage.put<AccountData>(accountID, accountRefetched);
  }

  async _submitTransaction(
    reveal: RevealData,
    options: {expectedNonce?: number; forceNonce?: number; maxFeePerGas: BigNumber, maxPriorityFeePerGas?: BigNumber}
  ): Promise<
    | {
        tx?: {hash: string; nonce: number; broadcastTime: number; maxFeePerGasUsed: string};
        error?: {message: string; code: number};
      }
    | undefined
  > {
    try {
      let nonceIncreased = false;
      let nonce: number | undefined;
      if (options.forceNonce) {
        nonce = options.forceNonce;
      }
      if (options.expectedNonce) {
        if (!nonce) {
          nonce = await this.wallet.getTransactionCount();
        }
        if (nonce !== options.expectedNonce) {
          if (nonce > options.expectedNonce) {
            const message = `nonce not matching, expected ${options.expectedNonce}, got ${nonce}, increasing...`;
            console.error(message);
            nonceIncreased = true;
            // return {error: {message, code: 5501}};
          } else {
            const message = `nonce not matching, expected ${options.expectedNonce}, got ${nonce}`;
            console.error(message);
            return {error: {message, code: 5501}};
          }
        }
      }

      let maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      // let feeHistory:
      // | {
      //     baseFeePerGas: string[];
      //     gasUsedRatio?: number[]; // not documented on https://playground.open-rpc.org/?schemaUrl=https://raw.githubusercontent.com/ethereum/eth1.0-apis/assembled-spec/openrpc.json&uiSchema%5BappBar%5D%5Bui:splitView%5D=false&uiSchema%5BappBar%5D%5Bui:input%5D=false&uiSchema%5BappBar%5D%5Bui:examplesDropdown%5D=false
      //     oldestBlock: number;
      //     reward: string[][];
      //   }
      // | undefined = undefined;
      // try {
      //   // TODO check what best to do to ensure we do not unecessarely high maxPriorityFeePerGas
      //   // in worst case, we could continue and try catch like below catching specific error message
      //   feeHistory = await this.provider.send('eth_feeHistory', [
      //     1,
      //     'latest',
      //     [100],
      //   ]);
      // } catch (e) {}
      // if (feeHistory) {
      //   if (options.maxFeePerGas.lt(feeHistory.reward[0][0])) {
      //     maxPriorityFeePerGas = options.maxFeePerGas;
      //   }
      //   this.info(feeHistory.reward);
      // } else {
      //   this.info('no feeHistory')
      // }

      // this.info('getting mathcing alliance...');
      // // const alliance = await this._getAlliance(reveal);
      // this.info({alliance});

      this.info('checcking if fleet still alive....');
      const {quantity} = await this.outerspaceContract.getFleet(reveal.fleetID, '0');
      this.info(`quantity: ${quantity}`);
      if (quantity === 0) {
        if (nonceIncreased) {
          return {error: {message: 'nonce increased but fleet already resolved', code: 5502}};
        } else {
          this.error('already done, sending dummy transaction');

          try {
            const tx = await this.wallet.sendTransaction({
              to: this.wallet.address,
              value: 0,
              nonce,
              maxFeePerGas: options.maxFeePerGas,
              maxPriorityFeePerGas,
            });
            return {
              tx: {
                hash: tx.hash,
                nonce: tx.nonce,
                broadcastTime: getTimestamp(),
                maxFeePerGasUsed: options.maxFeePerGas.toString(),
              },
            };
          } catch(e) {
            this.error(` FAILED TO SEND DUMMY TX: ${e.message || (e.toString && e.toString()) || e}`)
            // TODO do something
            throw e;
          }
        }
      }

      let tx;
      try {
        tx = await this.outerspaceContract.resolveFleet(
          reveal.fleetID,
          {
            from: xyToLocation(reveal.from.x, reveal.from.y),
            to: xyToLocation(reveal.to.x, reveal.to.y),
            distance: reveal.distance,
            arrivalTimeWanted: reveal.arrivalTimeWanted,
            secret: reveal.secret,
            gift: reveal.gift,
            specific: reveal.specific,
            fleetSender: reveal.fleetSender || reveal.player,
            operator: reveal.operator || reveal.player,
          },
          {
            nonce,
            maxFeePerGas: options.maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit: revealMaxGasEstimate
          }
        );
      } catch (e) {
        // TODO investigate error code for it ?
        if (e.message && e.message.indexOf && e.message.indexOf(' is bigger than maxFeePerGas ') !== -1) {
          this.error('RETRYING with maxPriorityFeePerGas = maxFeePerGas');
          tx = await this.outerspaceContract.resolveFleet(
            reveal.fleetID,
            {
              from: xyToLocation(reveal.from.x, reveal.from.y),
              to: xyToLocation(reveal.to.x, reveal.to.y),
              distance: reveal.distance,
              arrivalTimeWanted: reveal.arrivalTimeWanted,
              secret: reveal.secret,
              gift: reveal.gift,
              specific: reveal.specific,
              fleetSender: reveal.fleetSender || reveal.player,
              operator: reveal.operator || reveal.player,
            },
            {
              nonce,
              maxFeePerGas: options.maxFeePerGas,
              maxPriorityFeePerGas: options.maxFeePerGas,
              gasLimit: revealMaxGasEstimate
            }
          );
        } else {

          this.error(
            `FAILED TO SENDING TX... , TODO ? send dummy tx (Invalid, -32010 ?) ? ${e.message || (e.toString && e.toString()) || e}`
          );
          this.error({
            fleetID: reveal.fleetID,
            from: xyToLocation(reveal.from.x, reveal.from.y),
            to: xyToLocation(reveal.to.x, reveal.to.y),
            distance: reveal.distance,
            arrivalTimeWanted: reveal.arrivalTimeWanted,
            secret: reveal.secret,
            gift: reveal.gift,
            specific: reveal.specific,
            fleetSender: reveal.fleetSender || reveal.player,
            operator: reveal.operator || reveal.player,
            nonce,
            maxFeePerGas: options.maxFeePerGas,
            maxPriorityFeePerGas,
            gasLimit: revealMaxGasEstimate
          });
          // TODO make dummy tx
          // or even better resign all tx queued with lower nonce, to skip it
          // but note in that "better" case, we should not do it if a tx has been broadcasted as we cannot guarantee the broadcasted tx will not be included in the end
          throw e;
        }
      }
      return {
        tx: {
          hash: tx.hash,
          nonce: tx.nonce,
          broadcastTime: getTimestamp(),
          maxFeePerGasUsed: options.maxFeePerGas.toString(),
        },
      };
    } catch (e) {
      if (e.message && e.message.indexOf && e.message.indexOf(`is less than the block's baseFeePerGas`) !== -1) {
        // TODO ? push down the queue to not bother others...
      }
      console.error(e.message);
      // console.error(e);
      const error = e as {message?: string};
      return {error: {message: error.message || 'error caught: ' + e, code: 5502}};
    }
  }

  async _getAlliance(reveal: RevealData): Promise<string> {
    let alliance = '0x0000000000000000000000000000000000000000';
    if (reveal.gift) {
      alliance = '0x0000000000000000000000000000000000000001';
      if (reveal.potentialAlliances) {
        const planet = await this.outerspaceContract.getPlanet(xyToLocation(reveal.to.x, reveal.to.y));
        const planetOwner = planet.state.owner;
        if (planetOwner !== '0x0000000000000000000000000000000000000000') {
          for (const allianceToTest of reveal.potentialAlliances) {
            const allies = await this.allianceRegistryContract.arePlayersAllies(
              allianceToTest,
              reveal.player,
              planetOwner,
              reveal.startTime
            );
            this.info({allies, allianceToTest, player: reveal.player, planetOwner});
            if (allies) {
              alliance = allianceToTest;
              break;
            }
          }
        }
      }
    }
    return alliance;
  }

  async _checkPendingTransaction(pendingID: string, pendingReveal: PendingTransactionData): Promise<void> {
    const transaction = await this.provider.getTransaction(pendingReveal.tx.hash);
    if (!transaction || transaction.confirmations === 0) {
      const lastMaxFeeUsed = pendingReveal.tx.maxFeePerGasUsed;
      const broadcastingTime = Math.max(pendingReveal.arrivalTimeWanted, pendingReveal.startTime + pendingReveal.minDuration);
      const currentMaxFee = getMaxFeeFromArray(pendingReveal.maxFeesSchedule, getTimestamp() - broadcastingTime);
      if (!transaction || currentMaxFee.maxFeePerGas.gt(lastMaxFeeUsed)) {
        this.info(
          `broadcast reveal tx for fleet: ${pendingReveal.fleetID} ${
            transaction ? 'with new fee' : 'again as it was lost'
          } ... `
        );
        const {error, tx} = await this._submitTransaction(pendingReveal, {
          forceNonce: pendingReveal.tx.nonce,
          maxFeePerGas: currentMaxFee.maxFeePerGas,
          maxPriorityFeePerGas: currentMaxFee.maxPriorityFeePerGas
        });
        if (error) {
          // TODO
          this.error(error);
          return;
        } else if (!tx) {
          // impossible
          return;
        }
        pendingReveal.tx = tx;
        this.state.storage.put<PendingTransactionData>(pendingID, pendingReveal);
      }
    } else if (transaction.confirmations >= 12) {
      const txReceipt = await this.provider.getTransactionReceipt(pendingReveal.tx.hash);
      const accountID = `account_${pendingReveal.player.toLowerCase()}`;
      const accountData = await this.state.storage.get<AccountData | undefined>(accountID);
      if (accountData) {
        const maxFeeAllowed = getMaxFeeAllowed(pendingReveal.maxFeesSchedule);
        const minimumCost = maxFeeAllowed.mul(revealMaxGasEstimate);
        let gasCost = minimumCost;
        if (txReceipt.gasUsed && txReceipt.effectiveGasPrice) {
          gasCost = txReceipt.gasUsed?.mul(txReceipt.effectiveGasPrice);
        }
        const paymentUsed = BigNumber.from((await accountData).paymentUsed).add(gasCost);
        let paymentSpending = BigNumber.from((await accountData).paymentSpending).sub(minimumCost);
        if (paymentSpending.lt(0)) {
          paymentSpending = BigNumber.from(0);
        }
        // TODO move to sync stage ?
        //  could either make every tx go through the payment gateway and emit event there
        //  or do it on OuterSpace by adding an param to the event
        //  we just need payer address and amount reserved (spending)
        //  doing it via event has the advantage that the payment can be tacked back even after full db reset
        //  we could even process a signature from the payer
        //  the system would still require trusting the agent-service, but everything would at least be auditable
        accountData.paymentUsed = paymentUsed.toString();
        accountData.paymentSpending = paymentSpending.toString();
        this.state.storage.put<AccountData>(accountID, accountData);
      } else {
        this.error(`weird, accountData do not exist anymore`); // TODO handle it
      }
      this.state.storage.delete(pendingID);
      const revealID = `l_${pendingReveal.fleetID}`;
      this.state.storage.delete(revealID);
    }
  }

  async _fetchStartTime(reveal: RevealData): Promise<number | undefined> {
    // const tx = await this.provider.getTransactionReceipt(reveal.sendTxHash);
    // if (!tx) {
    //     const nonce = await this.provider.getTransactionCount(reveal.sendTxSender);
    // }
    const block = await this.provider.getBlock('latest');
    const lastestBlockFinalized = Math.max(0, block.number - this.finality);
    const fleet = await this.outerspaceContract.getFleet(reveal.fleetID, '0', {blockTag: lastestBlockFinalized});
    if (fleet.owner !== '0x0000000000000000000000000000000000000000') {
      // quantity == 0 means already submitted , should remove them ?
      return fleet.launchTime;
    } else {
      // this.info(`cannot get startTIme for fleet ${reveal.fleetID} ${fleet.launchTime} ${fleet.quantity} ${lastestBlockFinalized} ${block.number}`)
      return undefined;
    }
  }
}
