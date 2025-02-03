import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import type {QueryState, QueryStore, QueryStoreWithRuntimeVariables} from '$lib/utils/stores/graphql';
import {HookedQueryStore} from '$lib/utils/stores/graphql';
import type {EndPoint} from '$lib/utils/graphql/endpoint';
import {chainTempo} from '$lib/blockchain/chainTempo';
import type {Writable} from 'svelte/store';
import {writable} from 'svelte/store';

import {now} from '$lib/time';
import {initialContractsInfos} from '$lib/blockchain/contracts';
import {account, type AccountState} from '$lib/account/account';

export type YakuzaQueryResult = {
  fleetArrivedEvents: {
    yakuzaClaimAmountLeft: string;
    destinationOwner: {id: string};
    owner: {id: string};
    timestamp: string;
    fleetReveal: {
      id: string;
      fleet: {id: string};
      arrivalTimeWanted: string;
      from: {id: string};
      to: {id: string};
      gift: boolean;
      specific: string;
      secret: string;
      fleetSender: {id: string};
      operator: {id: string};
    };
  }[];
  yakuzaSubscription: {
    startTime: string;
    endTime: string;
  };
};

export type YakuzaClaimFleet = {
  id: string;
  yakuzaClaimAmountLeft: bigint;
  arrivalTime: number;
  arrivalTimeWanted: number;
  from: string;
  to: string;
  gift: boolean;
  specific: string;
  secret: string;
  fleetSender: string;
  operator: string;
};

export type YakuzaState = {
  loading: boolean;
  state?: {
    fleets: YakuzaClaimFleet[];
    yakuzaSubscription: {
      startTime: number;
      endTime: number;
    };
  };
};

export class YakuzaQueryStore implements QueryStore<YakuzaState> {
  private queryStore: QueryStoreWithRuntimeVariables<YakuzaQueryResult>;
  private store: Writable<QueryState<YakuzaState>>;
  private unsubscribeFromQuery: () => void | undefined;
  private stopAccountSubscription: (() => void) | undefined = undefined;
  private _timeout: NodeJS.Timeout | undefined;

  constructor(endpoint: EndPoint) {
    this.queryStore = new HookedQueryStore( // TODO full list
      endpoint,
      `query($first: Int! $lastId: ID! $myself: String $myselfOrYakuza: [String]! $time: BigInt!) {
       fleetArrivedEvents (first: $first where: {id_gt: $lastId won: true planetActive: true destinationOwner_in: $myselfOrYakuza owner_not_in: $myselfOrYakuza yakuzaClaimed: false timestamp_gt: $time}) {
    yakuzaClaimAmountLeft
    destinationOwner {id}
    owner {id}
    timestamp
 	  fleetReveal {
      id
      fleet {id}
      arrivalTimeWanted
      from {id}
      to {id}
      gift
      specific
      secret
      fleetSender {id}
      operator {id}
	  }   
  } 
  
  
  yakuzaSubscription(id: $myself) {
    startTime
    endTime
  }
  
}`,
      chainTempo, // replayTempo, //
      {
        variables: {
          first: 500,
          myself: '0x0000000000000000000000000000000000000000',
        },
      }
    );

    this.store = writable({step: 'IDLE'}, this.start.bind(this));
  }

  protected start(): () => void {
    this._timeout;
    this.queryStore.runtimeVariables.owner = '0x0000000000000000000000000000000000000000';
    this.queryStore.runtimeVariables.time = '' + this.getTime();
    this._timeout = setInterval(this.onTime.bind(this), 1000);
    this.stopAccountSubscription = account.subscribe(async ($account) => {
      await this._handleAccountChange($account);
    });
    this.unsubscribeFromQuery = this.queryStore.subscribe(this.update.bind(this));
    return this.stop.bind(this);
  }

  getTime(): number {
    const timestamp = now();
    return timestamp - (initialContractsInfos as any).contracts.Yakuza?.linkedData.maxClaimDelay || 0;
  }

  onTime(): void {
    this.queryStore.runtimeVariables.time = '' + this.getTime();
  }

  private _fetch(): Promise<void> {
    if (
      !this.queryStore.runtimeVariables.myself ||
      this.queryStore.runtimeVariables.myself === '0x0000000000000000000000000000000000000000'
    ) {
      this.store.update((v) => {
        v.data = v.data || {loading: false};
        v.data.loading = false;
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
    if (this.queryStore.runtimeVariables.myself !== accountAddress) {
      this.queryStore.runtimeVariables.myself = accountAddress;
      if ((initialContractsInfos as any).contracts.Yakuza) {
        this.queryStore.runtimeVariables.myselfOrYakuza = [
          accountAddress,
          (initialContractsInfos as any).contracts.Yakuza.address.toLowerCase(),
        ] as unknown as string;
      } else {
        this.queryStore.runtimeVariables.myselfOrYakuza = [accountAddress] as unknown as string;
      }

      if (!this.queryStore.runtimeVariables.myself) {
        this.queryStore.runtimeVariables.myself = '0x0000000000000000000000000000000000000000';
        if ((initialContractsInfos as any).contracts.Yakuza) {
          this.queryStore.runtimeVariables.myselfOrYakuza = [
            '0x0000000000000000000000000000000000000000',
            (initialContractsInfos as any).contracts.Yakuza.address.toLowerCase(),
          ] as unknown as string;
        } else {
          this.queryStore.runtimeVariables.myselfOrYakuza = [
            '0x0000000000000000000000000000000000000000',
          ] as unknown as string;
        }
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

  _transform(data?: YakuzaQueryResult): YakuzaState | undefined {
    if (!data) {
      return undefined;
    }

    const endTime = Number(data.yakuzaSubscription?.endTime || 0);
    const startTime = Number(data.yakuzaSubscription?.startTime || 0);
    return {
      loading: false,
      state: {
        fleets: data.fleetArrivedEvents
          .map((e) => ({
            id: e.fleetReveal.id,
            arrivalTime: Number(e.timestamp),
            arrivalTimeWanted: Number(e.fleetReveal.arrivalTimeWanted),
            fleetSender: e.fleetReveal.fleetSender.id,
            from: e.fleetReveal.from.id,
            gift: e.fleetReveal.gift,
            operator: e.fleetReveal.operator.id,
            to: e.fleetReveal.to.id,
            secret: e.fleetReveal.secret,
            specific: e.fleetReveal.specific,
            yakuzaClaimAmountLeft: BigInt(e.yakuzaClaimAmountLeft),
          }))
          .filter((v) => {
            const duringSubscription = v.arrivalTime > startTime && v.arrivalTime < endTime;
            if (!duringSubscription) {
              console.log(`${startTime} < ${v.arrivalTime} < ${endTime}`);
            }
            return duringSubscription;
          }),
        yakuzaSubscription: {
          endTime,
          startTime,
        },
      },
    };
  }

  private async update($query: QueryState<YakuzaQueryResult>): Promise<void> {
    const transformed = {
      step: $query.step,
      error: $query.error,
      data: this._transform($query.data),
    };
    this.store.set(transformed);
  }

  acknowledgeError(): void {
    return this.queryStore.acknowledgeError();
  }

  subscribe(
    run: Subscriber<QueryState<YakuzaState>>,
    invalidate?: Invalidator<QueryState<YakuzaState>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const yakuzaQuery = new YakuzaQueryStore(SUBGRAPH_ENDPOINT);

if (typeof window !== 'undefined') {
  (window as any).yakuzaQuery = yakuzaQuery;
}
