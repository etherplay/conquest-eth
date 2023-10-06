import {BaseStoreWithData} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import {blockTime, finality, logPeriod} from '$lib/config';
import type {BigNumber} from '@ethersproject/bignumber';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';

export type Departure = {
  amount: number;
  timestamp: number;
  fleet: string;
  owner: string;
};

export type FleetSentEvent = {
  args: {
    fleetOwner: string;
    from: BigNumber;
    fleet: BigNumber;
    quantity: number;
    newNumSpaceships: number;
  };
  blockNumber: number;
};

export type ShowPlanetDeparturesFlow = {
  type: 'SHOW_PLANET_DEPARTURE';
  step: 'IDLE' | 'LOADING' | 'READY';
  location?: string;
  departures?: Departure[];
  error?: {message?: string};
};

class ShowDeparturesFlowStore extends BaseStoreWithData<ShowPlanetDeparturesFlow, undefined> {
  public constructor() {
    super({
      type: 'SHOW_PLANET_DEPARTURE',
      step: 'IDLE',
    });
  }

  /*
  type FleetSentEvent implements OwnerEvent & PlanetEvent & FleetEvent @entity {
  id: ID! # <blockNumber>_logID
  blockNumber: Int!
  timestamp: BigInt!
  transaction: Transaction!
  owner: Owner!
  planet: Planet!
  fleet: Fleet!
  quantity: BigInt!
  newNumSpaceships: BigInt!
}
  */
  async show(location: string): Promise<void> {
    this.setPartial({step: 'LOADING', location});
    try {
      const query = `
query($owner: String $planet: String) {
  fleets(where: {from: $planet owner_not: $owner resolved: false} orderBy: launchTime orderDirection: desc) {
    id
    launchTime
    owner {id}
    quantity
  }
}`;
      const owner = wallet.address?.toLowerCase() || '0x0000000000000000000000000000000000000000';
      const result = await SUBGRAPH_ENDPOINT.query<{
        fleets: {id: string; launchTime: number; owner: {id: string}; quantity: number}[];
      }>(query, {
        variables: {
          owner,
          planet: location,
        },
      });

      // console.log(result);

      let departures = [];
      if (result.data) {
        departures = result.data.fleets.map((v) => {
          return {
            timestamp: v.launchTime,
            amount: v.quantity,
            fleet: v.id,
            owner: v.owner.id,
          };
        });
      }

      this.setPartial({
        step: 'READY',
        location,
        departures,
      });
    } catch (e) {
      this.setPartial({error: e});
    }
  }

  async cancel(): Promise<void> {
    this._reset();
  }

  async acknownledgeSuccess(): Promise<void> {
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  private _reset() {
    this.setPartial({step: 'IDLE', location: undefined});
  }
}

export default new ShowDeparturesFlowStore();
