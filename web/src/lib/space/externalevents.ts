import type {SpaceInfo} from 'conquest-eth-common';
import type {Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import {spaceInfo} from './spaceInfo';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import type {EndPoint} from '$lib/utils/graphql/endpoint';
import type {QueryState, QueryStore} from '$lib/utils/stores/graphql';
import {HookedQueryStore} from '$lib/utils/stores/graphql';
import type {FleetArrivedEvent} from './subgraphTypes';
import {chainTempo} from '$lib/blockchain/chainTempo';
import type {Invalidator, Subscriber, Unsubscriber} from 'web3w/dist/esm/utils/internals';

export type ExternalEventType = 'd' | '';

export type ExternalEvent = {
  type: ExternalEventType;
};

export type EventsQueryResult = {
  fleetArrivedEvents: FleetArrivedEvent[];
};

export class ExternalEventsStore implements QueryStore<ExternalEvent[]> {
  private readonly spaceInfo: SpaceInfo;
  private store: Writable<QueryState<ExternalEvent[]>>;
  private queryStore: QueryStore<EventsQueryResult>;
  private unsubscribeFromQuery: () => void | undefined;
  constructor(endpoint: EndPoint, spaceInfo: SpaceInfo) {
    this.spaceInfo = spaceInfo;
    this.queryStore = new HookedQueryStore( // TODO last 7 days (or last checkpoint)
      endpoint,
      `query($first: Int! $lastId: ID! $blockHash: String!) {
        fleetArrivedEvents(first: $first where: {id_gt: $lastId} block: {hash: $blockHash}) {
          id
        }
}`,
      chainTempo, // replayTempo, //
      {
        list: {path: 'fleetArrivedEvents'},
      }
    );

    this.store = writable({step: 'IDLE'}, this.start.bind(this));
  }

  protected start(): () => void {
    this.unsubscribeFromQuery = this.queryStore.subscribe(this.update.bind(this));
    return this.stop.bind(this);
  }

  protected stop(): void {
    if (this.unsubscribeFromQuery) {
      this.unsubscribeFromQuery();
      this.unsubscribeFromQuery = undefined;
    }
  }

  private async update($query: QueryState<EventsQueryResult>): Promise<void> {
    const transformed = {
      step: $query.step,
      error: $query.error,
      data: this._transform($query.data),
    };
    this.store.set(transformed);
  }

  _transform(data?: EventsQueryResult): ExternalEvent[] | undefined {
    if (!data) {
      return [];
    }
    return data.fleetArrivedEvents.map((event) => {
      return {
        type: 'd', // TODO
      };
    });
  }

  acknowledgeError(): void {
    return this.queryStore.acknowledgeError();
  }

  subscribe(
    run: Subscriber<QueryState<ExternalEvent[]>>,
    invalidate?: Invalidator<QueryState<ExternalEvent[]>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const externalEvents = new ExternalEventsStore(SUBGRAPH_ENDPOINT, spaceInfo);

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).externalEvents = externalEvents;
}
