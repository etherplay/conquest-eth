import {AutoStartBaseStore} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import {chainId, mediumFrequencyFetch} from '$lib/config';
import {BigNumber} from '@ethersproject/bignumber';
import {privateWallet, type PrivateWalletState} from './privateWallet';
import {createFuzdClient} from '$lib/utils/fuzd';
import {getResolutionTransactionData} from '$lib/flows/resolve';
import {spaceInfo} from '$lib/space/spaceInfo';

type Position = {x: number; y: number};

type AgentServiceAccountData = {
  balance: BigNumber;
  remoteAccount: `0x${string}`;
  requireTopUp: boolean;
  minimumBalance: BigNumber;
};

type AgentServiceState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: {code: number; message: string};
  account?: AgentServiceAccountData;
};

export type Submission = {
  chainId: string;
  slot: string;
  maxFeePerGasAuthorized: bigint;
  transaction: {
    data: `0x${string}`;
    to: `0x${string}`;
    gas: bigint;
  };
  time: number;
  expiry: number;
  paymentReserve?: bigint;
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

  async createSubmission(data: AgentData, options?: {force?: boolean}): Promise<Submission> {
    const maxFeePerGas = await wallet.provider.getGasPrice();
    const maxFeePerGasAuthorized = maxFeePerGas.mul(2).toBigInt();

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
    const submission: Submission = {
      chainId,
      slot: data.fleetID,
      expiry: resolutionData.expectedArrivalTime + 24 * 60 * 60, // TODO
      maxFeePerGasAuthorized,
      time: resolutionData.expectedArrivalTime,
      transaction: {
        data: (txData.data || `0x`) as `0x${string}`,
        gas, // TODO:fuzd make it optional
        to: txData.to as `0x${string}`,
      },
      paymentReserve: maxFeePerGasAuthorized * gas,
    };

    return submission;
  }

  async calculateCost(data: AgentData) {
    const submission = await this.createSubmission(data, {force: true});
    const cost = submission.maxFeePerGasAuthorized * submission.transaction.gas;
    return {
      cost,
      remoteAccount: this.$store.account.remoteAccount,
      submission,
    };
  }

  async submitReveal(submission: Submission): Promise<{queueID: string}> {
    const privateWalletState = privateWallet.getState();
    const fuzdClient = createFuzdClient(privateWalletState.missivPrivateKey);
    const remoteAccount = await fuzdClient.assignRemoteAccount(chainId);
    const balance = await wallet.provider.getBalance(remoteAccount.address);
    const account: AgentServiceAccountData = {
      balance,
      remoteAccount: remoteAccount.address,
      requireTopUp: false,
      minimumBalance: balance,
    };

    const result = await fuzdClient.scheduleExecution(submission, {
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
        const fuzdClient = createFuzdClient(this._lastPrivateKey);
        const remoteAccount = await fuzdClient.assignRemoteAccount(chainId);
        const balance = await wallet.provider.getBalance(remoteAccount.address);
        const account: AgentServiceAccountData = {
          balance,
          remoteAccount: remoteAccount.address,
          requireTopUp: false,
          minimumBalance: balance,
        };

        this.setPartial({
          state: 'Ready',
          account: account
            ? {
                balance: BigNumber.from(account.balance),
                remoteAccount: account.remoteAccount,
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
