import {BigNumber} from '@ethersproject/bignumber';
import {AutoStartBaseStore} from '$lib/utils/stores/base';
import {exitsQuery} from '$lib/space/exitsQuery';
import type {PlanetExitEvent} from '$lib/space/exitsQuery';
import type {ExitsState} from '$lib/space/exitsQuery';
import type {QueryState} from '$lib/utils/stores/graphql';
import {wallet} from '$lib/blockchain/wallet';
import {getGasPrice} from './gasPrice';

type Withdrawals = {
  state: 'Idle' | 'Loading' | 'Ready';
  balance: BigNumber;
};

class WithdrawalsStore extends AutoStartBaseStore<Withdrawals> {
  private timeout: NodeJS.Timeout | undefined;
  private exits: PlanetExitEvent[] = [];
  constructor() {
    super({state: 'Idle', balance: BigNumber.from(0)});
  }

  _onStart(): (() => void) | undefined {
    if (this.$store.state === 'Idle') {
      this.setPartial({state: 'Loading'});
    }
    return exitsQuery.subscribe(this.onExitsQuery.bind(this));
  }

  onExitsQuery(exitsState: QueryState<ExitsState>) {
    if (exitsState.data) {
      this.exits = exitsState.data.exits;
      let balance = exitsState.data.balanceToWithdraw;
      for (const exitEvent of exitsState.data.exits) {
        balance = balance.add(exitEvent.stake);
      }
      this.setPartial({balance, state: 'Ready'});
    }
  }

  async withdraw() {
    if (wallet.address && wallet.contracts) {
      let maxFeePerGas: BigNumber;
      let maxPriorityFeePerGas;
      const gasPrice = await getGasPrice(wallet.web3Provider);
      maxFeePerGas = gasPrice.maxFeePerGas;
      maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;

      const locations = this.exits.map((v) => v.planet.id);
      const tx = await wallet.contracts.OuterSpace.fetchAndWithdrawFor(wallet.address, locations, {
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
      // TODO :
      //  account.recordWithdrawal(tx.hash, tx.nonce);
    } else {
      throw new Error(` not wallet or contracts`);
    }
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export const withdrawals = new WithdrawalsStore();
