import {BaseStoreWithData} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import type {TransactionResponse} from '@ethersproject/abstract-provider';
import {agentService} from '$lib/account/agentService';
import {now} from '$lib/time';
import {AGENT_SERVICE_URL} from '$lib/config';
import {privateWallet} from '$lib/account/privateWallet';

export type AgentServiceWithdrawFlow = {
  type: 'WITHDRAW_AGENT_SERVICE';
  step: 'IDLE' | 'TRANSACTION' | 'MINED';
  error?: {message?: string};
};

class AgentServiceWithdrawFlowStore extends BaseStoreWithData<AgentServiceWithdrawFlow, undefined> {
  public constructor() {
    super({
      type: 'WITHDRAW_AGENT_SERVICE',
      step: 'IDLE',
    });
  }

  async withdraw(): Promise<void> {
    let tx: TransactionResponse;
    try {
      const withdrawalSubmission = {
        player: wallet.address,
        delegate: privateWallet.signer.address.toLowerCase(),
        nonceMsTimestamp: now() * 999 + (Math.floor(Date.now()) % 1000),
      };
      const withdrawMessageString = `withdraw:${wallet.address}:${withdrawalSubmission.nonceMsTimestamp}`;
      const withdrawalSignature = await privateWallet.signer.signMessage(withdrawMessageString);

      const response = await fetch(`${AGENT_SERVICE_URL}/requestWithdrawal`, {
        method: 'POST',
        body: JSON.stringify({
          ...withdrawalSubmission,
          signature: withdrawalSignature,
        }),
      });
      const json = await response.json();
      if (json.signature) {
        if (json.amount === '0') {
          console.error('zero balance');
          this.setPartial({error: {message: 'zero balance'}});
        } else {
          agentService.triggerUpdate();
          this.setPartial({step: 'TRANSACTION'});
          tx = await wallet.contracts?.PaymentWithdrawalGateway.withdraw(
            wallet.address,
            json.amount,
            json.timestamp,
            json.signature,
            json.amount
          );
        }
      } else {
        console.error(json.error);
        this.setPartial({error: json.error || 'unknown error'});
      }
    } catch (e) {
      console.error(e);
      if (e.message && e.message.indexOf('User denied') >= 0) {
        this.setPartial({
          step: 'IDLE',
          error: undefined,
        });
        return;
      }
      this.setPartial({error: e, step: 'IDLE'});
      return;
    }
    if (tx) {
      await tx.wait();
      agentService.triggerUpdate();
      this.setPartial({step: 'MINED'});
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

export default new AgentServiceWithdrawFlowStore();
