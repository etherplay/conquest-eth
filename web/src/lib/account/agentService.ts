import {AutoStartBaseStore} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import {AGENT_SERVICE_URL, mediumFrequencyFetch} from '$lib/config';
import type {WalletStore} from 'web3w';
import {BigNumber} from '@ethersproject/bignumber';
import {privateWallet} from './privateWallet';

type Position = {x: number; y: number};

type AgentServiceAccountData = {
  balance: BigNumber;
  delegate?: string;
  nonceMsTimestamp: number;
  requireTopUp: boolean;
  minimumBalance: BigNumber;
};

type AgentServiceState = {
  state: 'Idle' | 'Loading' | 'Ready';
  error?: {code: number; message: string};
  account?: AgentServiceAccountData;
};

class AgentServiceStore extends AutoStartBaseStore<AgentServiceState> {
  _timeout: NodeJS.Timeout;
  _stopped: boolean;
  _lastWallet?: string;
  _unsubscribeFromWallet?: () => void;

  async submitReveal(
    fleetID: string,
    secret: string,
    from: Position,
    to: Position,
    distance: number,
    arrivalTimeWanted: number,
    gift: boolean,
    specific: string,
    potentialAlliances: string[] | undefined,
    startTime: number,
    minDuration: number,
    fleetSender?: string,
    operator?: string
  ): Promise<{queueID: string}> {
    const walletAddress = wallet.address;
    const accountResponse = await fetch(`${AGENT_SERVICE_URL}/account/${walletAddress}`);
    const {account} = (await accountResponse.json()) as {
      account?: {
        balance: string;
        delegate?: string;
        nonceMsTimestamp: number;
        requireTopUp: boolean;
        minimumBalance: string;
      };
    };
    if (!account) {
      throw new Error(`no account registered for ${walletAddress}`);
    }
    const revealSubmission = {
      player: walletAddress.toLowerCase(),
      fleetID,
      secret,
      from,
      to,
      distance,
      arrivalTimeWanted,
      gift,
      specific,
      potentialAlliances,
      startTime,
      minDuration,
      nonceMsTimestamp: account.nonceMsTimestamp + 1,
      fleetSender,
      operator,
    };
    const queueMessageString = `queue:${revealSubmission.player}:${fleetID}:${secret}:${from.x}:${from.y}:${to.x}:${
      to.y
    }:${distance}:${gift}:${specific}:${
      potentialAlliances ? potentialAlliances.join(',') : ''
    }:${startTime}:${minDuration}:${arrivalTimeWanted}:${revealSubmission.nonceMsTimestamp}`;
    const queueSignature = await privateWallet.signer.signMessage(queueMessageString);
    const data = {...revealSubmission, signature: queueSignature, delegate: privateWallet.signer.address.toLowerCase()};
    // console.log(data);
    const response = await fetch(`${AGENT_SERVICE_URL}/queueReveal`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const jsonResult = await response.json();
    if (jsonResult.error) {
      throw jsonResult.error;
    }
    return jsonResult;
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
    this._unsubscribeFromWallet = wallet.subscribe(this._onWallet.bind(this));
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
    if (this._unsubscribeFromWallet) {
      this._unsubscribeFromWallet();
      this._unsubscribeFromWallet = undefined;
    }
    this._clearTimeoutIfAny();
    this._stopped = true;
  }

  _onWallet($wallet: WalletStore) {
    if (this._lastWallet != $wallet.address) {
      this._lastWallet = $wallet.address;
      this._clearTimeoutIfAny();
      this._check();
    }
  }

  async _check() {
    try {
      if (this._lastWallet) {
        const response = await fetch(`${AGENT_SERVICE_URL}/account/${this._lastWallet}`);
        const {account} = (await response.json()) as {
          account?: {
            balance: string;
            delegate?: string;
            nonceMsTimestamp: number;
            requireTopUp: boolean;
            minimumBalance: string;
          };
        };
        this.setPartial({
          state: 'Ready',
          account: account
            ? {
                balance: BigNumber.from(account.balance),
                delegate: account.delegate,
                nonceMsTimestamp: account.nonceMsTimestamp,
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
