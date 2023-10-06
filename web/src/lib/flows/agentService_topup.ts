import {BaseStoreWithData} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import type {BigNumber} from '@ethersproject/bignumber';
import type {TransactionResponse} from '@ethersproject/abstract-provider';
import {agentService} from '$lib/account/agentService';

export type AgentServiceTopUpFlow = {
  type: 'TOPUP_AGENT_SERVICE';
  step: 'IDLE' | 'TRANSACTION' | 'MINED';
  error?: {message?: string};
};

class AgentServiceTopUpFlowStore extends BaseStoreWithData<AgentServiceTopUpFlow, undefined> {
  public constructor() {
    super({
      type: 'TOPUP_AGENT_SERVICE',
      step: 'IDLE',
    });
  }

  async topup(amount: BigNumber): Promise<void> {
    let tx: TransactionResponse;
    try {
      this.setPartial({step: 'TRANSACTION'});
      tx = await wallet.provider.getSigner().sendTransaction({
        to: wallet.contracts?.PaymentGateway.address,
        value: amount.toHexString(),
      });
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

export default new AgentServiceTopUpFlowStore();
