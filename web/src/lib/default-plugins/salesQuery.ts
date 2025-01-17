import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import type {QueryState, QueryStore, QueryStoreWithRuntimeVariables} from '$lib/utils/stores/graphql';
import {HookedQueryStore} from '$lib/utils/stores/graphql';
import type {EndPoint} from '$lib/utils/graphql/endpoint';
import {chainTempo} from '$lib/blockchain/chainTempo';
import type {Writable} from 'svelte/store';
import {writable} from 'svelte/store';
// import type {
//   FleetArrivedEvent,
//   PlanetExitEvent,
//   PlanetInteruptedExitEvent,
//   planetTimePassedExitEvent,
// } from './subgraphTypes';
import {BigNumber} from '@ethersproject/bignumber';

export type SaleQueryState = {
  id: string;
  seller: string; // {id: string}
  pricePerUnit: string;
  timestamp: string;
  spaceshipsToKeep: string;
  spaceshipsLeftToSell: string;
};

export type SalesQueryResult = {
  spaceshipSales: SaleQueryState[];
};

export type SaleState = {
  id: string;
  seller: string; // {id: string}
  pricePerUnit: BigNumber;
  timestamp: number;
  spaceshipsToKeep: number;
  spaceshipsLeftToSell: number;
};

export type SalesState = {
  loading: boolean;
  sales: SaleState[];
};

export class SalesQueryStore implements QueryStore<SalesState> {
  private queryStore: QueryStoreWithRuntimeVariables<SalesQueryResult>;
  private store: Writable<QueryState<SalesState>>;
  private unsubscribeFromQuery: () => void | undefined;
  private stopAccountSubscription: (() => void) | undefined = undefined;
  /*
`query($first: Int! $lastId: ID! $blockNumber: Int $owner: String) {
  planets(first: $first where: {id_gt: $lastId} ?$blockNumber?block: {number:$blockNumber}?) {
  */
  constructor(endpoint: EndPoint) {
    this.queryStore = new HookedQueryStore( // TODO full list
      endpoint,
      `query($first: Int! $lastId: ID!) {
  spaceshipSales(first: $first where: {id_gt: $lastId}) {
    id
    seller
    pricePerUnit
    timestamp
    spaceshipsToKeep
    spaceshipsLeftToSell
  }
}`,
      chainTempo, // replayTempo, //
      {
        list: {path: 'spaceshipSales'},
        variables: {
          first: 500,
        },
      }
    );

    this.store = writable({step: 'IDLE'}, this.start.bind(this));
  }

  protected start(): () => void {
    this.unsubscribeFromQuery = this.queryStore.subscribe(this.update.bind(this));
    return this.stop.bind(this);
  }

  protected stop(): void {
    if (this.stopAccountSubscription) {
      this.stopAccountSubscription();
      this.stopAccountSubscription = undefined;
    }
    if (this.unsubscribeFromQuery) {
      this.unsubscribeFromQuery();
      this.unsubscribeFromQuery = undefined;
    }
  }

  _transform(data?: SalesQueryResult): SalesState | undefined {
    if (!data) {
      return undefined;
    }

    return {
      loading: false,
      sales: data.spaceshipSales.map((v) => {
        return {
          id: v.id,
          seller: v.seller,
          pricePerUnit: BigNumber.from(v.pricePerUnit),
          spaceshipsToKeep: parseInt(v.spaceshipsToKeep),
          spaceshipsLeftToSell: parseInt(v.spaceshipsLeftToSell),
          timestamp: parseInt(v.timestamp),
        };
      }),
    };
  }

  private async update($query: QueryState<SalesQueryResult>): Promise<void> {
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
    run: Subscriber<QueryState<SalesState>>,
    invalidate?: Invalidator<QueryState<SalesState>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const salesQuery = new SalesQueryStore(SUBGRAPH_ENDPOINT);
