import {wallet} from '$lib/blockchain/wallet';
import {BaseStoreWithData} from '$lib/utils/stores/base';
import {BigNumber} from '@ethersproject/bignumber';
import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';

type Data = {
  txHash?: string;
  numTokenUnit?: number;
};
export type MintFlow = {
  type: 'MINT';
  step: 'IDLE' | 'CONNECTING' | 'WAITING_CONFIRMATION' | 'CREATING_TX' | 'WAITING_TX' | 'TX_SUBMITTED' | 'SUCCESS';
  cancelingConfirmation?: boolean;
  data?: Data;
  error?: {message?: string};
};

class MintFlowStore extends BaseStoreWithData<MintFlow, Data> {
  public constructor() {
    super({
      type: 'MINT',
      step: 'IDLE',
    });
  }

  async mint(numTokenUnit: number): Promise<void> {
    this.setPartial({step: 'WAITING_CONFIRMATION', cancelingConfirmation: false});
    this.setData({numTokenUnit: numTokenUnit});
  }

  async confirm(numTokenUnit?: number): Promise<void> {
    const flow = this.setPartial({step: 'CREATING_TX'});
    if (!flow.data) {
      throw new Error(`no flow data`);
    }

    if (!numTokenUnit) {
      numTokenUnit = flow.data.numTokenUnit;
    }

    const amount = BigNumber.from(numTokenUnit * 10000).mul('100000000000000');
    const nativeTokenAmount = amount
      .mul('1000000000000000000')
      .div(contractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals);

    let gasEstimation: BigNumber;
    try {
      gasEstimation = await wallet.contracts?.PlayToken.estimateGas.mint(wallet.address, amount, {
        value: nativeTokenAmount,
      });
    } catch (e) {
      this.setPartial({
        step: 'WAITING_CONFIRMATION',
        error: e,
      });
      return;
    }
    // TODO gasEstimation for EXIT
    const gasLimit = gasEstimation.add(100000);

    this.setPartial({step: 'WAITING_TX'});
    let tx: {hash: string; nonce?: number};
    try {
      tx = await wallet.contracts?.PlayToken.mint(wallet.address, amount, {value: nativeTokenAmount, gasLimit});
    } catch (e) {
      if (e.transactionHash) {
        tx = {hash: e.transactionHash};
        try {
          const tResponse = await wallet.provider.getTransaction(e.transactionHash);
          tx = tResponse;
        } catch (e) {
          console.log(`could not fetch tx, to get the nonce`);
        }
      }
      if (!tx || !tx.hash) {
        console.error(e);
        if (e.message && e.message.indexOf('User denied') >= 0) {
          this.setPartial({
            step: 'IDLE',
            error: undefined,
          });
          return;
        }
        this.setPartial({
          step: 'WAITING_CONFIRMATION',
          error: e,
        });
        return;
      }
    }

    this.setData({txHash: tx.hash}, {step: 'TX_SUBMITTED'});
    await wallet.provider.waitForTransaction(tx.hash);
    this.setPartial({step: 'SUCCESS'});
  }

  async cancelCancelation(): Promise<void> {
    this.setPartial({cancelingConfirmation: false});
  }

  async cancel(cancelingConfirmation = false): Promise<void> {
    if (cancelingConfirmation) {
      this.setPartial({cancelingConfirmation: true});
    } else {
      this._reset();
    }
  }

  async acknownledgeSuccess(): Promise<void> {
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  private _reset() {
    this.setPartial({step: 'IDLE', data: undefined});
  }
}

export default new MintFlowStore();
