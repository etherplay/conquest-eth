import {BaseStoreWithData} from '$lib/utils/stores/base';
import {blockTime, finality, lowFrequencyFetch} from '$lib/config'; // logPeriod
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import type {GenericEvent, GenericParsedEvent, OwnerEvent} from './subgraphTypes';
import {parseEvent} from './subgraphTypes';
import {now} from '$lib/time';

export type GlobalLogs = {
  step: 'IDLE' | 'LOADING' | 'READY';
  data?: GenericParsedEvent[];
  error?: string;
};

type QueryData = OwnerEvent;

// TODO __typename_not_in: [""]
//  __typename cannot be used for that. should maybe add a manual typename
const eventsToFilterOut = [
  'TravelingUpkeepReductionFromDestructionEvent',
  'StakeToWithdrawEvent',
  'ExitCompleteEvent',
  'TravelingUpkeepRefundEvent',
];

class GlobalLogsStore extends BaseStoreWithData<GlobalLogs, GenericParsedEvent[]> {
  private timeout: NodeJS.Timeout;
  private logPeriod = Math.floor(7 * 24 * 60 * 60);
  public constructor() {
    super({
      step: 'IDLE',
    });
  }

  async fetch() {
    const timestamp = '' + (now() - this.logPeriod);

    const query = `
    query($first: Int! $lastId: ID! $timestamp: BigInt!){
      ownerEvents(
        first: $first

        where: {
          timestamp_gt: $timestamp
          id_gt: $lastId
          # TODO : __typename_not_in: ['TravelingUpkeepReductionFromDestructionEvent', 'StakeToWithdrawEvent', 'ExitCompleteEvent']
        }
      ) {
    id
    __typename
    transaction {id}
    timestamp
    owner {id}
    ... on  PlanetEvent{
       planet {id}
     }
    ... on PlanetStakeEvent{
      numSpaceships
      stake
     }
    ... on PlanetExitEvent{
      exitTime
      stake
      interupted
    }
    ... on PlanetTransferEvent{
      newNumspaceships
      newTravelingUpkeep
      newOverflow
      newOwner {id}
    }
    ... on  FleetArrivedEvent{
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
    ... on FleetSentEvent{
      sender {id}
      operator
      fleet{id resolveTransaction{id}}
      quantity
    }
  }
}

`;
    try {
      const result = await SUBGRAPH_ENDPOINT.queryList<
        QueryData,
        {
          timestamp: string;
        }
      >(query, {
        variables: {timestamp},
        path: 'ownerEvents',
        context: {
          requestPolicy: 'network-only', // required as cache-first will not try to get new data
        },
      });

      if (!result) {
        console.error(result);
        this.setPartial({error: `cannot fetch from thegraph node`});
        throw new Error(`cannot fetch from thegraph node`);
      }

      const events = result
        .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
        .filter((v) => eventsToFilterOut.indexOf(v.__typename) === -1)
        .map(parseEvent)
        .filter((v) => !!v); // TODO event not parsed : RewardToWithdrawEvent

      this.setPartial({data: events});

      this.setPartial({step: 'READY'});
      // TODO
    } catch (e) {
      console.error(e);
    }

    this.timeout = setTimeout(this.fetch.bind(this), lowFrequencyFetch * 1000);
  }

  start(logPeriod?: number) {
    if (logPeriod) {
      this.logPeriod = logPeriod;
    }
    if (this.$store.step === 'IDLE') {
      this.setPartial({step: 'LOADING'});
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(this.fetch.bind(this), 1000);
  }

  stop() {
    this.setPartial({step: 'IDLE'});
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export const globalLogs = new GlobalLogsStore();
