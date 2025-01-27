import {wallet} from '$lib/blockchain/wallet';
import {xyToLocation} from 'conquest-eth-common';
import {BaseStoreWithData} from '$lib/utils/stores/base';
import {account} from '$lib/account/account';
import type {BigNumber} from '@ethersproject/bignumber';
import {getGasPrice} from './gasPrice';

type Data = {
  txHash?: string;
  location: {x: number; y: number};
};
export type ExitFlow = {
  type: 'EXIT';
  step: 'IDLE' | 'CONNECTING' | 'WAITING_CONFIRMATION' | 'CREATING_TX' | 'WAITING_TX' | 'SUCCESS';
  cancelingConfirmation?: boolean;
  data?: Data;
  error?: {message?: string};
};

class ExitFlowStore extends BaseStoreWithData<ExitFlow, Data> {
  public constructor() {
    super({
      type: 'EXIT',
      step: 'IDLE',
    });
  }

  async exitFrom(location: {x: number; y: number}): Promise<void> {
    this.setData({location}, {step: 'CONNECTING'});
    this.setPartial({step: 'WAITING_CONFIRMATION', cancelingConfirmation: false});
  }

  async confirm(): Promise<void> {
    const flow = this.setPartial({step: 'CREATING_TX'});
    if (!flow.data) {
      throw new Error(`no flow data`);
    }

    let latestBlock;
    try {
      latestBlock = await wallet.provider.getBlock('latest');
    } catch (e) {
      this.setPartial({
        step: 'WAITING_CONFIRMATION',
        error: e,
      });
      return;
    }

    let maxFeePerGas: BigNumber;
    let maxPriorityFeePerGas;
    try {
      const gasPrice = await getGasPrice(wallet.web3Provider);
      maxFeePerGas = gasPrice.maxFeePerGas;
      maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
    } catch (e) {
      this.setPartial({
        step: 'WAITING_CONFIRMATION',
        error: e,
      });
      return;
    }

    const location = flow.data.location;
    const locationId = xyToLocation(location.x, location.y);

    let gasEstimation: BigNumber;
    try {
      gasEstimation = await wallet.contracts?.OuterSpace.estimateGas.exitFor(wallet.address, locationId);
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
      tx = await wallet.contracts?.OuterSpace.exitFor(wallet.address, locationId, {
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
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

    account.recordExit(location, tx.hash, latestBlock.timestamp, tx.nonce);

    this.setData({txHash: tx.hash}, {step: 'SUCCESS'});
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

export default new ExitFlowStore();
