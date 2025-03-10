import {AutoStartBaseStore} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import {chainId, mediumFrequencyFetch} from '$lib/config';
import {BigNumber} from '@ethersproject/bignumber';
import {privateWallet, type PrivateWalletState} from './privateWallet';
import {createFuzdClient} from '$lib/utils/fuzd';
import {getResolutionTransactionData} from '$lib/flows/resolve';
import {spaceInfo} from '$lib/space/spaceInfo';
import type {FuzdClient} from 'fuzd-client';
import {initialContractsInfos} from '$lib/blockchain/contracts';

// TODO
// needed because for some reason fuzd-client type cannot be imported
import type {PartialSubmission, PriorTransactionInfo, Submission} from './fuzd-client-types';

// TODO fix fuzd-client types exports ?
type Fees = {
  fixed: string;
  per_1_000_000: number;
};
type DerivationParameters = {
  type: string;
  data: any;
};
type ExecutionServiceParameters = {
  derivationParameters: DerivationParameters;
  expectedWorstCaseGasPrice?: string;
  fees: Fees;
};
type RemoteAccountInfo = {
  serviceParameters: ExecutionServiceParameters;
  address: `0x${string}`;
  debt: string;
};

type Position = {x: number; y: number};

type AgentServiceAccountData = {
  balance: BigNumber;
  remoteAccount: `0x${string}`;
  serviceParameters: ExecutionServiceParameters;
  requireTopUp: boolean;
  minimumBalance: BigNumber;
};

type AgentServiceState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: {code: number; message: string};
  account?: AgentServiceAccountData;
};

export type AgentData = {
  fleetID: string;
  nonce?: number;
  fleetOwner: string;
  secret: string;
  from: Position;
  to: Position;
  distance: number;
  arrivalTimeWanted: number;
  gift: boolean;
  specific: string;
  potentialAlliances: string[] | undefined;
  startTime: number;
  minDuration: number;
  fleetSender?: string;
  operator?: string;
};

class AgentServiceStore extends AutoStartBaseStore<AgentServiceState> {
  _timeout: NodeJS.Timeout;
  _stopped: boolean;
  _lastPrivateKey?: `0x${string}`;
  _unsubscribeFromPrivateWallet?: () => void;
  fuzdClient: FuzdClient;

  async createSubmission(data: AgentData, options?: {force?: boolean}): Promise<PartialSubmission> {
    const remoteAccount = this.$store.account.remoteAccount;
    const serviceParameters = this.$store.account.serviceParameters;
    const maxFeePerGas = await wallet.provider.getGasPrice();

    let maxFeePerGasAuthorized: bigint;
    if (!serviceParameters?.expectedWorstCaseGasPrice) {
      maxFeePerGasAuthorized = maxFeePerGas.mul(2).toBigInt();
    } else {
      maxFeePerGasAuthorized = BigInt(serviceParameters.expectedWorstCaseGasPrice);
    }

    const fromPlanetInfo = spaceInfo.getPlanetInfo(data.from.x, data.from.y);
    const toPlanetInfo = spaceInfo.getPlanetInfo(data.to.x, data.to.y);
    const {txData, resolutionData} = await getResolutionTransactionData(
      {
        from: fromPlanetInfo,
        to: toPlanetInfo,
        gift: data.gift,
        specific: data.specific,
        arrivalTimeWanted: data.arrivalTimeWanted,
        launchTime: data.startTime,
        owner: data.fleetOwner as `0x${string}`,
        fleetSender: data.fleetSender,
        operator: data.operator,
      },
      {
        id: data.fleetID,
        secret: data.secret,
      },
      options
    );

    const gas = txData.gasLimit?.toBigInt() || 0n;
    const expiryDelta =
      initialContractsInfos.contracts.OuterSpace.linkedData.resolveWindow +
      Math.ceil(initialContractsInfos.contracts.OuterSpace.linkedData.resolveWindow / 10);

    let criticalDelta = initialContractsInfos.contracts.OuterSpace.linkedData.resolveWindow / 20;

    const submission: PartialSubmission = {
      chainId,
      slot: data.fleetID,

      maxFeePerGasAuthorized,
      timing: {
        type: 'delta-time-with-target-time',
        expiryDelta,
        delta: resolutionData.fleetDuration,
        targetTimeUnlessHigherDelta: resolutionData.expectedArrivalTime,
      },
      criticalDelta,
      transaction: {
        data: (txData.data || `0x`) as `0x${string}`,
        gas, // TODO:fuzd make it optional
        to: txData.to as `0x${string}`,
      },
      paymentReserve: {amount: maxFeePerGasAuthorized * gas, broadcaster: remoteAccount},
      onBehalf: wallet.address.toLowerCase() as `0x${string}`,
    };

    return submission;
  }

  async prepareSubmission(data: AgentData) {
    const remoteAccount = this.$store.account.remoteAccount;
    const submission = await this.createSubmission(data, {force: true});
    const requirement: {amountReserved: bigint; totalMaxCost: bigint; balanceRequired: bigint} =
      await this.fuzdClient.computeBalanceRequired({
        slot: submission.slot,
        chainId: submission.chainId,
        maxFeePerGasAuthorized: submission.maxFeePerGasAuthorized,
        gas: submission.transaction.gas,
      });

    const {balanceRequired, amountReserved, totalMaxCost} = requirement;
    const balance = (await wallet.provider.getBalance(remoteAccount)).toBigInt();

    console.log(`remoteAccount`, {balance, balanceRequired, amountReserved, totalMaxCost});

    return {
      valueRequiredToSend: balanceRequired > balance ? balanceRequired - balance : 0n,
      remoteAccount,
      submission,
    };
  }

  async submitReveal(
    partialSubmission: PartialSubmission,
    transaction: PriorTransactionInfo
  ): Promise<{queueID: string}> {
    // could also support fixed-time and fixed-round with `assumedTransaction`
    let submission: Submission;
    if (
      partialSubmission.timing.type === 'delta-time' ||
      partialSubmission.timing.type === 'delta-time-with-target-time'
    ) {
      submission = {...partialSubmission, timing: {...partialSubmission.timing, startTransaction: transaction}};
    } else {
      submission = {...partialSubmission, timing: partialSubmission.timing};
    }
    const result = await this.fuzdClient.scheduleExecution(submission, {
      // fakeEncrypt: time.hasTimeContract,
    });

    if (result.success) {
      return {queueID: `${result.info.chainId}:${result.info.account}:${result.info.slot}`};
    } else {
      throw new Error(result.error);
    }
  }

  constructor() {
    super({state: 'Idle'});
  }

  triggerUpdate() {
    this._clearTimeoutIfAny();
    this._check();
  }

  acknowledgeError(): void {
    this.setPartial({error: undefined});
  }

  _onStart() {
    this._stopped = false;
    this._unsubscribeFromPrivateWallet = privateWallet.subscribe(this._onPrivateWallet.bind(this));
    this.setPartial({state: 'Loading'});
    this._check();
    return this._stop.bind(this);
  }

  _clearTimeoutIfAny() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  _stop() {
    if (this._unsubscribeFromPrivateWallet) {
      this._unsubscribeFromPrivateWallet();
      this._unsubscribeFromPrivateWallet = undefined;
    }
    this._clearTimeoutIfAny();
    this._stopped = true;
  }

  _onPrivateWallet($wallet: PrivateWalletState) {
    if (this._lastPrivateKey != $wallet.missivPrivateKey) {
      this._lastPrivateKey = $wallet.missivPrivateKey;
      this._clearTimeoutIfAny();
      this._check();
    }
  }

  async _check() {
    try {
      if (this._lastPrivateKey) {
        this.fuzdClient = createFuzdClient(this._lastPrivateKey);
        const remoteAccount: RemoteAccountInfo = await this.fuzdClient.assignRemoteAccount(chainId);
        const balance = await wallet.provider.getBalance(remoteAccount.address);
        const account: AgentServiceAccountData = {
          balance,
          remoteAccount: remoteAccount.address,
          serviceParameters: remoteAccount.serviceParameters,
          requireTopUp: false,
          minimumBalance: balance,
        };

        this.setPartial({
          state: 'Ready',
          account: account
            ? {
                balance: BigNumber.from(account.balance),
                remoteAccount: account.remoteAccount,
                serviceParameters: account.serviceParameters,
                requireTopUp: account.requireTopUp,
                minimumBalance: BigNumber.from(account.minimumBalance),
              }
            : undefined,
        });
      } else {
        this.setPartial({
          state: 'Ready',
          account: undefined,
        });
      }
    } catch (e) {
      this.setPartial({
        state: 'Loading',
        account: undefined,
      });
      console.error(e);
    }

    if (!this._stopped) {
      this._timeout = setTimeout(this._check.bind(this), mediumFrequencyFetch * 1000);
    }
  }
}

export const agentService = new AgentServiceStore();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).agentService = agentService;
}
