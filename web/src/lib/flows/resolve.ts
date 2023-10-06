import {wallet} from '$lib/blockchain/wallet';
import {xyToLocation} from 'conquest-eth-common';
import {BaseStore} from '$lib/utils/stores/base';
import {account} from '$lib/account/account';
import {isCorrected, correctTime} from '$lib/time';
import type {Fleet} from '$lib/space/fleets';
import {BigNumber} from '@ethersproject/bignumber';
import selection from '$lib/map/selection';

export type ResolveStep = 'IDLE' | 'SHOW_LIST' | 'CONNECTING' | 'CREATING_TX' | 'WAITING_TX' | 'SUCCESS';
export type ResolveFlow = {
  type: 'RESOLVE';
  step: ResolveStep;
  cancelingConfirmation?: boolean;
  pastStep: ResolveStep;
  error?: unknown;
};

class ResolveFlowStore extends BaseStore<ResolveFlow> {
  constructor() {
    super({
      type: 'RESOLVE',
      step: 'IDLE',
      pastStep: 'IDLE',
    });
  }

  showList() {
    this.setPartial({step: 'SHOW_LIST', pastStep: 'SHOW_LIST'});
    selection.unselect();
  }

  async back(): Promise<void> {
    this.setPartial({step: this.$store.pastStep || 'IDLE'});
  }

  async resolve(fleet: Fleet, pastStep?: ResolveStep, force = false): Promise<void> {
    this.setPartial({step: 'CREATING_TX', cancelingConfirmation: undefined, pastStep: pastStep || 'IDLE'});

    let nonce = fleet.sending.action.nonce;
    if (!nonce) {
      console.error('NO NONCE FOUND, fetching from transaciton hash');

      let tx: {hash: string; nonce?: number};
      try {
        tx = await wallet.provider.getTransaction(fleet.sending.id);
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
          this.setPartial({
            step: 'IDLE',
            error: e,
          });
          return;
        }
      }
      nonce = tx.nonce;
      // TODO why the following was needed in one instance?
      // nonce = tx.nonce - 1;

      // TODO tx.nonce might not be correct, we need to have fleet.sending.action.nonce
      //  what we could do though, is to use a different name, like secretNonce
    }

    const fleetData = await account.hashFleet(
      fleet.from.location,
      fleet.to.location,
      fleet.gift,
      fleet.specific,
      fleet.arrivalTimeWanted,
      nonce,
      fleet.owner,
      fleet.fleetSender,
      fleet.operator
    );

    let latestBlock;
    try {
      latestBlock = await wallet.provider.getBlock('latest');
    } catch (e) {
      this.setPartial({
        step: 'IDLE',
        error: e,
      });
      return;
    }
    if (!isCorrected) {
      // TODO extreact or remove (assume time will be corrected by then)
      correctTime(latestBlock.timestamp);
    }

    const secretHash = fleetData.secretHash;
    // console.log('resolve', {secretHash});
    const distanceSquared =
      Math.pow(fleet.to.location.globalX - fleet.from.location.globalX, 2) +
      Math.pow(fleet.to.location.globalY - fleet.from.location.globalY, 2);
    const distance = Math.floor(Math.sqrt(distanceSquared));

    console.log({
      fleetData,
      secretHash,
      distance,
      fleet,
    });

    // let currentGasPrice;
    // try {
    //   currentGasPrice = await wallet.provider.getGasPrice();
    // } catch (e) {
    //   this.setPartial({
    //     step: 'IDLE',
    //     error: e,
    //   });
    //   return;
    // }
    // const gasPrice = currentGasPrice.mul(2);
    const gasPrice = undefined;

    let gasEstimation: BigNumber;

    if (force) {
      gasEstimation = BigNumber.from(1000000);
    } else {
      try {
        gasEstimation = await wallet.contracts?.OuterSpace.estimateGas.resolveFleet(fleetData.fleetId, {
          from: xyToLocation(fleet.from.location.x, fleet.from.location.y),
          to: xyToLocation(fleet.to.location.x, fleet.to.location.y),
          distance,
          arrivalTimeWanted: fleet.arrivalTimeWanted,
          secret: secretHash,
          gift: fleet.gift,
          specific: fleet.specific,
          fleetSender: fleet.fleetSender || fleet.owner,
          operator: fleet.operator || fleet.owner,
        });
      } catch (e) {
        this.setPartial({error: e, step: this.$store.pastStep || 'IDLE'});
        return;
      }
    }

    // TODO gasEstimation for resolve
    const gasLimit = gasEstimation.add(200000);

    // const gasLimit = 1000000;

    this.setPartial({step: 'WAITING_TX'});
    try {
      const tx = await wallet.contracts?.OuterSpace.resolveFleet(
        fleetData.fleetId,
        {
          from: xyToLocation(fleet.from.location.x, fleet.from.location.y),
          to: xyToLocation(fleet.to.location.x, fleet.to.location.y),
          distance,
          arrivalTimeWanted: fleet.arrivalTimeWanted,
          secret: secretHash,
          gift: fleet.gift,
          specific: fleet.specific,
          fleetSender: fleet.fleetSender || fleet.owner,
          operator: fleet.operator || fleet.owner,
        },
        {gasPrice, gasLimit}
      );
      account.recordFleetResolvingTxhash(
        fleetData.fleetId,
        fleet.txHash,
        tx.hash,
        fleet.to.location,
        latestBlock.timestamp,
        tx.nonce,
        false
      );
      this.setPartial({step: 'SUCCESS'}); // TODO IDLE ?
    } catch (e) {
      console.error(e);
      // TODO get next Fleet instead ?
      if (e.message && e.message.indexOf('User denied') >= 0) {
        this.setPartial({
          step: this.$store.pastStep || 'IDLE',
          error: undefined,
        });
        return;
      }
      this.setPartial({error: e, step: this.$store.pastStep || 'IDLE'});
      return;
    }
    this.setPartial({error: undefined, step: this.$store.pastStep || 'IDLE'});
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
    this.setPartial({step: 'IDLE'});
  }
}

export default new ResolveFlowStore();
