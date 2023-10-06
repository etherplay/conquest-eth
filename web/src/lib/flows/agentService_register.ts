import {BaseStoreWithData} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import {now} from '$lib/time';
import {account} from '$lib/account/account';
import {AGENT_SERVICE_URL} from '$lib/config';
import {agentService} from '$lib/account/agentService';

export type RegisterFlow = {
  type: 'REGISTER_AGENT_SERVICE';
  step: 'IDLE' | 'LOADING' | 'READY';
  error?: {message?: string};
};

class RegisterFlowStore extends BaseStoreWithData<RegisterFlow, undefined> {
  public constructor() {
    super({
      type: 'REGISTER_AGENT_SERVICE',
      step: 'IDLE',
    });
  }

  async register(delegateAddress: string): Promise<void> {
    this.setPartial({step: 'LOADING'});
    try {
      const registrationSubmission = {
        player: wallet.address,
        delegate: delegateAddress,
        nonceMsTimestamp: now() * 999 + (Math.floor(Date.now()) % 1000),
      };
      const messageString = `conquest-agent-service: register ${registrationSubmission.delegate.toLowerCase()} as delegate for ${registrationSubmission.player.toLowerCase()} (nonce: ${
        registrationSubmission.nonceMsTimestamp
      })`;
      const registerSignature = await wallet.provider.getSigner().signMessage(messageString);

      const response = await fetch(`${AGENT_SERVICE_URL}/register`, {
        method: 'POST',
        body: JSON.stringify({
          ...registrationSubmission,
          signature: registerSignature,
        }),
      });
      const json = await response.json();
      if (json.success) {
        account.recordAgentServiceDefault(true);
        agentService.triggerUpdate();
      } else {
        console.error(json.error);
        this.setPartial({error: json.error || 'unknown error'});
      }
    } catch (e) {
      console.error(e);
      this.setPartial({error: e});
    }
  }

  async cancel(): Promise<void> {
    this._reset();
  }

  async acknownledgeSuccess(): Promise<void> {
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  private _reset() {
    this.setPartial({step: 'IDLE'});
  }
}

export default new RegisterFlowStore();
