import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import type {QueryState, QueryStore, QueryStoreWithRuntimeVariables} from '$lib/utils/stores/graphql';
import {HookedQueryStore} from '$lib/utils/stores/graphql';
import type {EndPoint} from '$lib/utils/graphql/endpoint';
import {chainTempo} from '$lib/blockchain/chainTempo';
import type {Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import type {AccountState} from '$lib/account/account';
import {account} from '$lib/account/account';
import {now} from '$lib/time';
import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
import {BigNumber} from '@ethersproject/bignumber';

export type PlanetExitEvent = {
  exitTime: string;
  planet: {id: string};
  stake: string;
};

export type ExitsQueryResult = {
  planetExitEvents: PlanetExitEvent[];
  owner: {
    playTokenBalance: string;
    freePlayTokenBalance: string;
    tokenToWithdraw: string;
  };
};

export type ExitsState = {
  loading: boolean;
  exits: PlanetExitEvent[];
  balanceToWithdraw: BigNumber;
};

export class ExitQueryStore implements QueryStore<ExitsState> {
  private queryStore: QueryStoreWithRuntimeVariables<ExitsQueryResult>;
  private store: Writable<QueryState<ExitsState>>;
  private unsubscribeFromQuery: () => void | undefined;
  private stopAccountSubscription: (() => void) | undefined = undefined;
  private _resolveFetch: () => void | undefined;
  private _timeout: NodeJS.Timeout | undefined;

  constructor(endpoint: EndPoint) {
    this.queryStore = new HookedQueryStore( // TODO full list
      endpoint,
      `query($first: Int! $lastId: ID! $time: BigInt! $owner: String) {
  planetExitEvents(first: $first where: {interupted: false success: false id_gt: $lastId exitTime_lt: $time owner: $owner}) {
    exitTime
    planet {id}
    stake
  }
  owner(id: $owner) {
    playTokenBalance
    freePlayTokenBalance
    tokenToWithdraw
  }
}`,
      chainTempo, // replayTempo, //
      {
        list: {path: 'planetExitEvents'},
      }
    );

    this.store = writable({step: 'IDLE', exits: [], balaceToWithdraw: BigNumber.from(0)}, this.start.bind(this));
  }

  getTime(): number {
    return now() - contractsInfos.contracts.OuterSpace.linkedData.exitDuration;
  }

  protected start(): () => void {
    this._timeout;
    this.queryStore.runtimeVariables.time = '' + this.getTime();
    // console.log(this.queryStore.runtimeVariables);
    this.queryStore.runtimeVariables.owner = '0x0000000000000000000000000000000000000000';
    this._timeout = setInterval(this.onTime.bind(this), 1000);
    this.stopAccountSubscription = account.subscribe(async ($account) => {
      await this._handleAccountChange($account);
    });
    this.unsubscribeFromQuery = this.queryStore.subscribe(this.update.bind(this));

    return this.stop.bind(this);
  }

  onTime(): void {
    this.queryStore.runtimeVariables.time = '' + this.getTime();
    // console.log(this.queryStore.runtimeVariables);
  }

  protected stop(): void {
    if (this._timeout) {
      clearInterval(this._timeout);
      this._timeout = undefined;
    }
    if (this.stopAccountSubscription) {
      this.stopAccountSubscription();
      this.stopAccountSubscription = undefined;
    }
    if (this.unsubscribeFromQuery) {
      this.unsubscribeFromQuery();
      this.unsubscribeFromQuery = undefined;
    }
  }

  triggerUpdate(): Promise<void> {
    return new Promise((resolve, reject) => {
      this._resolveFetch = resolve;
      this._fetch().catch((e) => reject(e));
    });
  }

  private _fetch(): Promise<void> {
    if (
      !this.queryStore.runtimeVariables.owner ||
      this.queryStore.runtimeVariables.owner === '0x0000000000000000000000000000000000000000'
    ) {
      this.store.update((v) => {
        v.data = v.data || {loading: false, exits: [], balanceToWithdraw: BigNumber.from(0)};
        v.data.loading = false;
        v.data.exits = [];
        v.data.balanceToWithdraw = BigNumber.from(0);
        return v;
      });
      return;
    }
    return this.queryStore.fetch({
      blockNumber: chainTempo.chainInfo.lastBlockNumber,
    });
  }

  private async _handleAccountChange($account: AccountState): Promise<void> {
    const accountAddress = $account.ownerAddress?.toLowerCase();
    if (this.queryStore.runtimeVariables.owner !== accountAddress) {
      this.queryStore.runtimeVariables.owner = accountAddress;
      if (!this.queryStore.runtimeVariables.owner) {
        this.queryStore.runtimeVariables.owner = '0x0000000000000000000000000000000000000000';
      }
      this.store.update((v) => {
        if (v.data) {
          v.data.loading = true;
        }
        return v;
      });
      this._fetch();
    }
    // TODO
    // delete other account data in sync
    // by the way, planet can be considered loading if the blockHash their state is taken from is different than latest query blockHash
    // this means we have to keep track of each planet query's blockHash
    // then a global loading flag could be set based on whether there is at least one planet loading, or account changed
  }

  _transform(data?: ExitsQueryResult): ExitsState | undefined {
    if (!data) {
      return undefined;
    }

    return {
      loading: false,
      exits: data.planetExitEvents,
      balanceToWithdraw: data.owner ? BigNumber.from(data.owner.tokenToWithdraw) : BigNumber.from(0),
    };
  }

  private async update($query: QueryState<ExitsQueryResult>): Promise<void> {
    const transformed = {
      step: $query.step,
      error: $query.error,
      data: this._transform($query.data),
    };
    this.store.set(transformed);

    // trigger the waiting
    const resolveFetch = this._resolveFetch;
    if (resolveFetch) {
      this._resolveFetch = undefined;
      resolveFetch();
    }
  }

  acknowledgeError(): void {
    return this.queryStore.acknowledgeError();
  }

  subscribe(
    run: Subscriber<QueryState<ExitsState>>,
    invalidate?: Invalidator<QueryState<ExitsState>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const exitsQuery = new ExitQueryStore(SUBGRAPH_ENDPOINT);
