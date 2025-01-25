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
import type {
  FleetArrivedEvent,
  FleetArrivedParsedEvent,
  FleetSentEvent,
  FleetSentParsedEvent,
  PlanetInteruptedExitEvent,
  PlanetInteruptedExitParsedEvent,
  PlanetTimePassedExitEvent,
  PlanetTimePassedExitParsedEvent,
} from './subgraphTypes';
import {
  parseFleetArrived,
  parseFleetSentEvent,
  parsePlanetInteruptedExitEvent,
  parseplanetTimePassedExitEvent,
} from './subgraphTypes';
import {deletionDelay} from '$lib/config';
import {now} from '$lib/time';
import {BigNumber} from '@ethersproject/bignumber';
import {spaceInfo} from './spaceInfo';
import {initialContractsInfos} from '$lib/blockchain/contracts';

// const blockRange = Math.floor(deletionDelay / blockTime);
const timeRange = deletionDelay;

export type PlanetQueryState = {
  id: string;
  owner: {id: string};
  numSpaceships: string;
  flagTime: string;
  travelingUpkeep: string;
  overflow: string;
  lastUpdated: string;
  exitTime: string;
  active: boolean;
  rewardGiver: string;
};

export type PlanetContractState = {
  id: string;
  owner: string;
  numSpaceships: number;
  flagTime: number;
  travelingUpkeep: number;
  overflow: number;
  lastUpdated: number;
  exitTime: number;
  active: boolean;
  rewardGiver: string;
};

export type SpaceQueryResult = {
  nullplanets: PlanetQueryState[]; // TODO remove: make owner == null => 0x00000
  otherplanets: PlanetQueryState[];
  myplanets?: PlanetQueryState[];
  owner?: {
    id: string;
    playTokenBalance: string;
    freePlayTokenBalance: string;
    freePlayTokenClaimBalance: string;
    tokenToWithdraw: string;
  };
  space?: {minX: string; maxX: string; minY: string; maxY: string; address: string};
  chain?: {blockHash: string; blockNumber: string};
  _meta: {
    block: {
      number: number;
      hash: string;
    };
  };
  fleetsArrivedFromYou?: FleetArrivedEvent[]; // TODO
  fleetsArrivedToYou?: FleetArrivedEvent[]; // TODO
  fleetsArrivedAsYou?: FleetArrivedEvent[]; // TODO
  fleetsSentExternally?: FleetSentEvent[];
  planetInteruptedExitEvents?: PlanetInteruptedExitEvent[];
  planetTimePassedExitEvents?: PlanetTimePassedExitEvent[];
};

export type SpaceState = {
  invalid?: boolean;
  outofsync?: {
    delta: number;
  };
  player?: {
    id: string;
    playTokenBalance: BigNumber;
    freePlayTokenBalance: BigNumber;
    freePlayTokenClaimBalance: BigNumber;
    tokenToWithdraw: BigNumber;
  };
  planets: PlanetContractState[];
  loading: boolean;
  space?: {x1: number; x2: number; y1: number; y2: number; address: string};
  chain?: {blockHash: string; blockNumber: string};
  _meta: {
    block: {
      number: number;
      hash: string;
    };
  };
  fleetsArrivedFromYou: FleetArrivedParsedEvent[]; // TODO
  fleetsArrivedToYou: FleetArrivedParsedEvent[]; // TODO
  fleetsArrivedAsYou: FleetArrivedParsedEvent[]; // TODO
  fleetsSentExternally: FleetSentParsedEvent[];
  planetInteruptedExitEvents?: PlanetInteruptedExitParsedEvent[];
  planetTimePassedExitEvents?: PlanetTimePassedExitParsedEvent[];
};

// TODO fleetArrivedEvents need to be capped from 7 days / latest acknowledged block number
export class SpaceQueryStore implements QueryStore<SpaceState> {
  private queryStore: QueryStoreWithRuntimeVariables<SpaceQueryResult>;
  private store: Writable<QueryState<SpaceState>>;
  private unsubscribeFromQuery: () => void | undefined;
  private stopAccountSubscription: (() => void) | undefined = undefined;
  /*
`query($first: Int! $lastId: ID! $blockNumber: Int $owner: String) {
  planets(first: $first where: {id_gt: $lastId} ?$blockNumber?block: {number:$blockNumber}?) {
  */
  constructor(endpoint: EndPoint) {
    this.queryStore = new HookedQueryStore( // TODO full list
      endpoint,
      `query($first: Int! $lastId: ID! $owner: String $fromTime: Int! $exitTimeEnd: Int!) {
  nullplanets: planets(first: 1000 where: {owner: null}) {
    id
    numSpaceships
    flagTime
    travelingUpkeep
    overflow
    lastUpdated
    exitTime
    active
    rewardGiver
  }
  otherplanets: planets(first: $first where: {id_gt: $lastId ?$owner?owner_not: $owner?}) {
    id
    owner {
      id
    }
    numSpaceships
    flagTime
    travelingUpkeep
    overflow
    lastUpdated
    exitTime
    active
    rewardGiver
  }
  chain(id: "Chain") {
    blockHash
    blockNumber
  }
  _meta {
    block {
      number
      hash
    }
  }
  space(id: "Space") {
    minX
    maxX
    minY
    maxY
    address
  }
  ?$owner?
  owner(id: $owner) {
    id
    playTokenBalance
    freePlayTokenBalance
    freePlayTokenClaimBalance
    tokenToWithdraw
  }
  myplanets: planets(first: 1000 where: {owner: $owner}) {
    id
    owner {
      id
    }
    numSpaceships
    flagTime
    travelingUpkeep
    overflow
    lastUpdated
    exitTime
    active
    rewardGiver
  }
  planetInteruptedExitEvents: planetExitEvents(where: {owner: $owner exitTime_gt: $fromTime interupted: true} orderBy: timestamp, orderDirection: desc) {
    id
    blockNumber
    timestamp
    transaction {id}
    owner {id}
    planet {id}
    exitTime
    stake
    interupted
    complete
    success
  }
  planetTimePassedExitEvents: planetExitEvents(where: {owner: $owner exitTime_gt: $fromTime exitTime_lt: $exitTimeEnd interupted: false} orderBy: timestamp, orderDirection: desc) {
    id
    blockNumber
    timestamp
    transaction {id}
    owner {id}
    planet {id}
    exitTime
    stake
    interupted
    complete
    success
  }
  fleetsArrivedFromYou: fleetArrivedEvents(where: {sender: $owner timestamp_gt: $fromTime} orderBy: timestamp, orderDirection: desc) {
    id
    blockNumber
    timestamp
    transaction {id}
    owner {id}
    planet {id}
    sender {id}
    operator
    fleet {id}
    destinationOwner {id}
    taxLoss
    planetActive
    numSpaceshipsAtArrival
    gift
    fleetLoss
    planetLoss
    inFlightFleetLoss
    inFlightPlanetLoss
    won
    newNumspaceships
    newTravelingUpkeep
    newOverflow
    accumulatedDefenseAdded
    accumulatedAttackAdded
    from {id}
    quantity
  }

  fleetsArrivedAsYou: fleetArrivedEvents(where: {sender_not: $owner owner: $owner destinationOwner_not: $owner timestamp_gt: $fromTime} orderBy: timestamp, orderDirection: desc) {
    id
    blockNumber
    timestamp
    transaction {id}
    owner {id}
    planet {id}
    sender {id}
    operator
    fleet {id}
    destinationOwner {id}
    taxLoss
    planetActive
    numSpaceshipsAtArrival
    gift
    fleetLoss
    planetLoss
    inFlightFleetLoss
    inFlightPlanetLoss
    won
    newNumspaceships
    newTravelingUpkeep
    newOverflow
    accumulatedDefenseAdded
    accumulatedAttackAdded
    from {id}
    quantity
  }

  fleetsArrivedToYou: fleetArrivedEvents(where: {destinationOwner: $owner sender_not: $owner timestamp_gt: $fromTime} orderBy: timestamp, orderDirection: desc) {
    id
    blockNumber
    timestamp
    transaction {id}
    owner {id}
    planet {id}
    sender {id}
    operator
    fleet {id}
    destinationOwner {id}
    taxLoss
    planetActive
    numSpaceshipsAtArrival
    gift
    fleetLoss
    planetLoss
    inFlightFleetLoss
    inFlightPlanetLoss
    won
    newNumspaceships
    newTravelingUpkeep
    newOverflow
    accumulatedDefenseAdded
    accumulatedAttackAdded
    from {id}
    quantity
  }
  fleetsSentExternally: fleetSentEvents(where: {sender: $owner owner_not: $owner operator_not: $owner timestamp_gt: $fromTime} orderBy: timestamp, orderDirection: desc) {
    id
    blockNumber
    timestamp
    transaction {id}
    owner {id}
    planet {id}
    sender {id}
    operator
    fleet {id resolveTransaction {id}}
    quantity
  }
  ?
}`,
      chainTempo, // replayTempo, //
      {
        list: {path: 'otherplanets'},
        variables: {
          first: 500,
        },
        prefetchCallback: (variables) => {
          // if (variables.blockNumber && typeof variables.blockNumber === 'number') {
          //   variables.fromBlock = Math.max(0, variables.blockNumber - blockRange);
          // }

          const timestamp = now();
          let exitTimeEnd = Math.floor(Math.max(0, timestamp - spaceInfo.exitDuration));

          const bootstrapSessionEndTime = spaceInfo.bootstrapSessionEndTime;
          if (bootstrapSessionEndTime > 0) {
            const infinityStartTime = spaceInfo.infinityStartTime;
            if (timestamp >= bootstrapSessionEndTime && timestamp < infinityStartTime) {
              exitTimeEnd = Math.floor(timestamp);
            }
          }

          variables.exitTimeEnd = exitTimeEnd;
          variables.fromTime = Math.floor(Math.max(0, now() - timeRange));
        },
      }
    );

    this.store = writable({step: 'IDLE'}, this.start.bind(this));
  }

  protected start(): () => void {
    this.stopAccountSubscription = account.subscribe(async ($account) => {
      await this._handleAccountChange($account);
    });
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

  private async _handleAccountChange($account: AccountState): Promise<void> {
    const accountAddress = $account.ownerAddress?.toLowerCase();
    // console.log({$account});
    if (this.queryStore.runtimeVariables.owner !== accountAddress) {
      this.queryStore.runtimeVariables.owner = accountAddress;
      this.store.update((v) => {
        if (v.data) {
          v.data.loading = true;
          // console.log(`change of account: loading query`);
        }
        return v;
      });
      this.queryStore.fetch({blockNumber: chainTempo.chainInfo.lastBlockNumber});
    }
    // TODO
    // delete other account data in sync
    // by the way, planet can be considered loading if the blockHash their state is taken from is different than latest query blockHash
    // this means we have to keep track of each planet query's blockHash
    // then a global loading flag could be set based on whether there is at least one planet loading, or account changed
  }

  _transform(data?: SpaceQueryResult): SpaceState | undefined {
    if (!data) {
      // console.log(`still loading query, no data!`);
      return undefined;
    }

    if (
      data.space &&
      data.space.address.toLowerCase() !== initialContractsInfos.contracts.OuterSpace.address.toLowerCase()
    ) {
      console.log('INVALID', {
        spaceAddress: data.space.address.toLowerCase(),
        contractAddress: initialContractsInfos.contracts.OuterSpace.address.toLowerCase(),
      });
      return {
        outofsync: undefined,
        invalid: true,
        loading: false,
        player: data.owner
          ? {
              id: data.owner.id,
              playTokenBalance: BigNumber.from(data.owner.playTokenBalance),
              freePlayTokenBalance: BigNumber.from(data.owner.freePlayTokenBalance),
              freePlayTokenClaimBalance: BigNumber.from(data.owner.freePlayTokenClaimBalance),
              tokenToWithdraw: BigNumber.from(data.owner.tokenToWithdraw),
            }
          : this.queryStore.runtimeVariables.owner
          ? {
              id: this.queryStore.runtimeVariables.owner,
              playTokenBalance: BigNumber.from(0),
              freePlayTokenBalance: BigNumber.from(0),
              freePlayTokenClaimBalance: BigNumber.from(0),
              tokenToWithdraw: BigNumber.from(0),
            }
          : undefined,
        planets: [],
        space: data.space
          ? {
              x1: -parseInt(data.space.minX),
              x2: parseInt(data.space.maxX),
              y1: -parseInt(data.space.minY),
              y2: parseInt(data.space.maxY),
              address: data.space.address,
            }
          : undefined,
        chain: data.chain
          ? {
              blockHash: data.chain.blockHash,
              blockNumber: data.chain.blockNumber,
            }
          : undefined,
        _meta: data._meta,
        fleetsArrivedFromYou: [],
        fleetsArrivedToYou: [],
        fleetsArrivedAsYou: [],
        fleetsSentExternally: [],
        planetInteruptedExitEvents: [],
        planetTimePassedExitEvents: [],
      };
    }

    let outofsync: {delta: number} | undefined;
    if (data._meta.block.number < chainTempo.chainInfo.lastBlockNumber - 100) {
      // TODO config
      outofsync = {delta: chainTempo.chainInfo.lastBlockNumber - data._meta.block.number};
    }

    const planets = (data.myplanets || []).concat(data.nullplanets.concat(data.otherplanets));
    // console.log(`stop loading query!`);
    return {
      loading: false,
      outofsync,
      player: data.owner
        ? {
            id: data.owner.id,
            playTokenBalance: BigNumber.from(data.owner.playTokenBalance),
            freePlayTokenBalance: BigNumber.from(data.owner.freePlayTokenBalance),
            freePlayTokenClaimBalance: BigNumber.from(data.owner.freePlayTokenClaimBalance),
            tokenToWithdraw: BigNumber.from(data.owner.tokenToWithdraw),
          }
        : this.queryStore.runtimeVariables.owner
        ? {
            id: this.queryStore.runtimeVariables.owner,
            playTokenBalance: BigNumber.from(0),
            freePlayTokenBalance: BigNumber.from(0),
            freePlayTokenClaimBalance: BigNumber.from(0),
            tokenToWithdraw: BigNumber.from(0),
          }
        : undefined,
      planets: planets.map((v) => {
        return {
          id: v.id,
          owner: v.owner ? v.owner.id : undefined,
          numSpaceships: parseInt(v.numSpaceships),
          flagTime: parseInt(v.flagTime),
          travelingUpkeep: parseInt(v.travelingUpkeep),
          overflow: parseInt(v.overflow),
          lastUpdated: parseInt(v.lastUpdated),
          exitTime: parseInt(v.exitTime),
          active: v.active,
          rewardGiver: v.rewardGiver,
        };
      }),
      space: data.space
        ? {
            x1: -parseInt(data.space.minX),
            x2: parseInt(data.space.maxX),
            y1: -parseInt(data.space.minY),
            y2: parseInt(data.space.maxY),
            address: data.space.address,
          }
        : undefined,
      chain: data.chain
        ? {
            blockHash: data.chain.blockHash,
            blockNumber: data.chain.blockNumber,
          }
        : undefined,
      _meta: data._meta,
      fleetsArrivedFromYou: !data.fleetsArrivedFromYou ? [] : data.fleetsArrivedFromYou.map(parseFleetArrived),
      fleetsArrivedToYou: !data.fleetsArrivedToYou ? [] : data.fleetsArrivedToYou.map(parseFleetArrived),
      fleetsArrivedAsYou: !data.fleetsArrivedAsYou ? [] : data.fleetsArrivedAsYou.map(parseFleetArrived),
      fleetsSentExternally: !data.fleetsSentExternally ? [] : data.fleetsSentExternally.map(parseFleetSentEvent),
      planetInteruptedExitEvents: !data.planetInteruptedExitEvents
        ? []
        : data.planetInteruptedExitEvents.map(parsePlanetInteruptedExitEvent),
      planetTimePassedExitEvents: !data.planetTimePassedExitEvents
        ? []
        : data.planetTimePassedExitEvents.map(parseplanetTimePassedExitEvent),
    };
  }

  private async update($query: QueryState<SpaceQueryResult>): Promise<void> {
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
    run: Subscriber<QueryState<SpaceState>>,
    invalidate?: Invalidator<QueryState<SpaceState>> | undefined
  ): Unsubscriber {
    return this.store.subscribe(run, invalidate);
  }
}

export const spaceQuery = new SpaceQueryStore(SUBGRAPH_ENDPOINT);
