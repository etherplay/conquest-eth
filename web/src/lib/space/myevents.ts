import type {SpaceInfo} from 'conquest-eth-common';
import type {Readable, Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import {spaceInfo} from './spaceInfo';
import type {SpaceQueryWithPendingState} from '$lib/space/optimisticSpace';
import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';
import type {AccountState, Acknowledgements, PendingActions} from '$lib/account/account';
import {account} from '$lib/account/account';
import type {
  FleetArrivedParsedEvent,
  FleetSentParsedEvent,
  OwnerParsedEvent,
  PlanetExitParsedEvent,
} from '$lib/space/subgraphTypes';
import {BigNumber} from '@ethersproject/bignumber';

export type MyEventBase = {
  type: 'external_fleet_arrived' | 'internal_fleet_arrived' | 'external_fleet_sent' | 'exit_complete';
  id: string;
  effect: 'good' | 'bad' | 'neutral';
  acknowledged?: 'NO' | 'YES' | 'UPDATED_SINCE';
  event: OwnerParsedEvent;
  location: string;
};

export type ExternalFleetEvent = MyEventBase & {
  type: 'external_fleet_arrived';
  event: FleetArrivedParsedEvent;
};

export type InternalFleetEvent = MyEventBase & {
  type: 'internal_fleet_arrived';
  event: FleetArrivedParsedEvent;
};

export type ExternalFleetSentEvent = MyEventBase & {
  type: 'external_fleet_sent';
  event: FleetSentParsedEvent;
};

export type ExitCompleteEvent = MyEventBase & {
  type: 'exit_complete';
  event: PlanetExitParsedEvent;
  interupted: boolean;
};

export type MyEvent = ExternalFleetEvent | InternalFleetEvent | ExternalFleetSentEvent | ExitCompleteEvent;

export class MyEventsStore implements Readable<MyEvent[]> {
  private readonly spaceInfo: SpaceInfo;
  private store: Writable<MyEvent[]>;
  private events: MyEvent[] = [];
  private currentOwner: string;
  private tmpEvents: MyEvent[] = [];
  private tmpPlayer: string;
  private acknowledgements: Acknowledgements;
  private pendingActions: PendingActions;

  constructor(spaceInfo: SpaceInfo) {
    this.spaceInfo = spaceInfo;
    this.store = writable(this.events);
    spaceQueryWithPendingActions.subscribe(this.onSpaceUpdate.bind(this));
    account.subscribe(this._handleAccountChange.bind(this));
  }

  private onSpaceUpdate(update: SpaceQueryWithPendingState): void {
    // console.log(`update from space...`);
    const newEvents = [];
    // TODO get access to update.accountAddress
    if (update.queryState.data?.fleetsArrivedFromYou) {
      for (const fleetArrived of update.queryState.data.fleetsArrivedFromYou) {
        newEvents.push({
          type: 'internal_fleet_arrived',
          event: fleetArrived,
          effect:
            fleetArrived.operator !== fleetArrived.sender.id
              ? fleetArrived.destinationOwner.id === this.currentOwner?.toLowerCase()
                ? fleetArrived.gift
                  ? 'good'
                  : 'bad'
                : 'neutral'
              : fleetArrived.won || fleetArrived.gift
              ? 'good'
              : 'neutral',
          id: BigNumber.from(fleetArrived.fleet.id).toHexString(), // TODO remove BigNumber conversion by makign fleetId bytes32 on OuterSPace.sol
          location: fleetArrived.planet.id,
        });
      }
      for (const fleetArrived of update.queryState.data.fleetsArrivedToYou) {
        newEvents.push({
          type: 'external_fleet_arrived',
          effect: fleetArrived.gift ? 'good' : 'bad',
          event: fleetArrived,
          id: BigNumber.from(fleetArrived.fleet.id).toHexString(), // TODO remove BigNumber conversion by makign fleetId bytes32 on OuterSPace.sol
          location: fleetArrived.planet.id,
        });
      }
      for (const fleetArrived of update.queryState.data.fleetsArrivedAsYou) {
        newEvents.push({
          type: 'external_fleet_arrived',
          effect: fleetArrived.gift ? 'good' : 'bad', // TODO
          event: fleetArrived,
          id: BigNumber.from(fleetArrived.fleet.id).toHexString(), // TODO remove BigNumber conversion by makign fleetId bytes32 on OuterSPace.sol
          location: fleetArrived.planet.id,
        });
      }
      for (const fleetSent of update.queryState.data.fleetsSentExternally) {
        // console.log({fleetSent});
        newEvents.push({
          type: 'external_fleet_sent',
          effect: 'neutral',
          event: fleetSent,
          id: 'sent_' + BigNumber.from(fleetSent.fleet.id).toHexString(), // TODO remove BigNumber conversion by makign fleetId bytes32 on OuterSPace.sol
          location: fleetSent.planet.id,
        });
      }
    }

    if (update.queryState.data?.planetTimePassedExitEvents) {
      for (const exitEvent of update.queryState.data.planetTimePassedExitEvents) {
        newEvents.push({
          type: 'exit_complete',
          location: exitEvent.planet.id,
          id: exitEvent.planet.id,
          effect: 'good',
          event: exitEvent,
          interupted: false,
        });
      }
    }

    if (update.queryState.data?.planetInteruptedExitEvents) {
      for (const exitEvent of update.queryState.data.planetInteruptedExitEvents) {
        newEvents.push({
          type: 'exit_complete',
          location: exitEvent.planet.id,
          id: exitEvent.planet.id,
          event: exitEvent,
          effect: 'bad',
          interupted: true,
        });
      }
    }

    const newPlayerID = update.queryState.data?.player?.id;
    if (this.currentOwner !== newPlayerID) {
      this.tmpPlayer = newPlayerID;
      this.tmpEvents = newEvents;
      this.events.length = 0;
      // TODO loading ?
    } else {
      this.events = this.addAcknowledgements(newEvents);
    }

    this.store.set(this.events);
  }

  private addAcknowledgements(events: MyEvent[]): MyEvent[] {
    for (const event of events) {
      const eventId = event.id;
      const acknowledgment = this.acknowledgements && this.acknowledgements[eventId];
      if (!acknowledgment) {
        event.acknowledged = 'NO';
      } else {
        let eventStateHash;
        if (event.type === 'internal_fleet_arrived' || event.type === 'external_fleet_arrived') {
          eventStateHash = event.event.planetLoss + ':' + event.event.fleetLoss + ':' + event.event.won;
        } else if (event.type === 'external_fleet_sent') {
          eventStateHash = '' + event.event.quantity;
        } else if (event.type === 'exit_complete') {
          eventStateHash = `${event.interupted}`;
        }

        if (acknowledgment.stateHash !== eventStateHash) {
          event.acknowledged = 'UPDATED_SINCE';
        } else {
          event.acknowledged = 'YES';
        }
      }
    }

    // TODO should we include all and filter in UI instead ?
    return events.filter((v) => v.acknowledged !== 'YES').sort((a, b) => a.event.timestamp - b.event.timestamp);
  }

  private async _handleAccountChange($account: AccountState): Promise<void> {
    const newPlayer = $account.ownerAddress?.toLowerCase();
    this.acknowledgements = $account.data?.acknowledgements;
    this.pendingActions = $account.data?.pendingActions;

    if ($account.step === 'IDLE') {
      this.currentOwner = undefined;
      this.events = [];
    } else if (this.currentOwner === newPlayer) {
      this.events = this.addAcknowledgements(this.events);
    } else if (newPlayer === this.tmpPlayer) {
      this.currentOwner = newPlayer;
      this.events = this.addAcknowledgements(this.tmpEvents);
    } else {
      this.currentOwner = newPlayer;
      this.events = [];
      // TODO loading
    }

    this.store.set(this.events);
  }

  subscribe(run: (value: MyEvent[]) => void, invalidate?: (value?: MyEvent[]) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }
}

export const myevents = new MyEventsStore(spaceInfo);

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).myevents = myevents;
}
