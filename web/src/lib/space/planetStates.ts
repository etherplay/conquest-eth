import type {SpaceQueryWithPendingState, SyncedPendingActions} from '$lib/space/optimisticSpace';
import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';
import {now, time} from '$lib/time';
import type {PlanetInfo, PlanetState} from 'conquest-eth-common';
import {xyToLocation} from 'conquest-eth-common';
import type {MetadataTable} from './planetMetadata';
import {planetMetadata} from './planetMetadata';
import {spaceInfo} from './spaceInfo';
import type {PlanetContractState, SpaceState} from './spaceQuery';

type ListenerInfo = {planetInfo: PlanetInfo; func: (planetState: PlanetState) => void};

export class PlanetStates {
  private planetListeners: Record<string, number[] | undefined> = {};
  private listenerIndex = 0;
  private listeners: Record<number, ListenerInfo> = {};

  private spaceStateCache: SpaceQueryWithPendingState;
  private pendingActionsPerPlanet: {[location: string]: SyncedPendingActions};
  private metadataTable: MetadataTable = {};

  private started = false;
  start(): void {
    // TODO auto start on subscribe
    if (!this.started) {
      this.started = true;
      time.subscribe(this.onTime.bind(this));
      spaceQueryWithPendingActions.subscribe(this.onSpaceUpdate.bind(this));
      planetMetadata.subscribe(this.onMetadataUpdated.bind(this));
    }
  }

  onPlannetUpdates(planetInfo: PlanetInfo, func: (planetState: PlanetState) => void): number {
    this.listenerIndex++;
    this.listeners[this.listenerIndex] = {planetInfo, func};
    let currentListeners = this.planetListeners[planetInfo.location.id];
    if (!currentListeners) {
      currentListeners = [];
    }
    currentListeners.push(this.listenerIndex);
    this.planetListeners[planetInfo.location.id] = currentListeners;

    if (this.spaceStateCache) {
      this.processSpace(this.spaceStateCache, now());
    }

    return this.listenerIndex;
  }

  switchOffPlanetUpdates(listenerIndex: number): void {
    const {planetInfo} = this.listeners[listenerIndex];
    delete this.listeners[listenerIndex];

    // delete from planet if not needed anymore
    const planetId = planetInfo.location.id;
    const listeners = this.planetListeners[planetId];
    if (listeners) {
      const num = listeners.length;
      for (let i = 0; i < num; i++) {
        const listenerIndex = listeners[i];
        const listener = this.listeners[listenerIndex];
        if (!listener) {
          listeners.splice(i, 1);
          if (listeners.length === 0) {
            delete this.planetListeners[planetId];
          }
        }
      }
    }
  }

  private onTime() {
    if (this.spaceStateCache) {
      this.processSpace(this.spaceStateCache, now());
    }
  }

  private onSpaceUpdate(update: SpaceQueryWithPendingState): void {
    // console.log(`on space update for planets`);
    if (!update.queryState.data) {
      console.log('hmmm, no data...');
      // TODO error
      return;
    }
    this.spaceStateCache = update;
    this.pendingActionsPerPlanet = {};
    for (const pendingAction of update.pendingActions) {
      if (pendingAction.action.type === 'CAPTURE') {
        const locations = pendingAction.action.planetCoords.map((v) => xyToLocation(v.x, v.y));
        for (const location of locations) {
          const currentlist = (this.pendingActionsPerPlanet[location] = this.pendingActionsPerPlanet[location] || []);
          currentlist.push(pendingAction);
        }
      } else if (pendingAction.action.type === 'SEND') {
        const location = xyToLocation(pendingAction.action.from.x, pendingAction.action.from.y);
        const currentlist = (this.pendingActionsPerPlanet[location] = this.pendingActionsPerPlanet[location] || []);
        currentlist.push(pendingAction);
      } else if (pendingAction.action.type === 'EXIT') {
        const location = xyToLocation(pendingAction.action.planetCoords.x, pendingAction.action.planetCoords.y);
        const currentlist = (this.pendingActionsPerPlanet[location] = this.pendingActionsPerPlanet[location] || []);
        currentlist.push(pendingAction);
      }
    }

    this.processSpace(update, now());
  }

  onMetadataUpdated(metadataTable: MetadataTable): void {
    this.metadataTable = metadataTable;
    if (this.spaceStateCache) {
      this.processSpace(this.spaceStateCache, now());
    }
  }

  private processSpace(space: SpaceQueryWithPendingState, time: number): void {
    if (!space.queryState.data || !space.queryState.data.space) {
      return;
    }

    const planetContractStates: {[id: string]: PlanetContractState} = {};
    for (const planetContractState of space.queryState.data.planets) {
      planetContractStates[planetContractState.id] = planetContractState;
    }

    const planetIds = Object.keys(this.planetListeners);
    for (const planetId of planetIds) {
      const listeners = this.planetListeners[planetId];
      if (listeners.length > 0) {
        const listenerInfo = this.listeners[listeners[0]];
        const planetState = this._transformPlanet(
          listenerInfo.planetInfo,
          space.queryState.data,
          this.pendingActionsPerPlanet,
          planetContractStates[listenerInfo.planetInfo.location.id],
          time
        );
        this._call(listeners, planetState);
      }
    }
  }

  private _transformPlanet(
    planetInfo: PlanetInfo,
    space: SpaceState,
    pendingActionsPerPlanet: {[location: string]: SyncedPendingActions},
    contractState: PlanetContractState | undefined,
    time: number
  ): PlanetState {
    const inReach =
      planetInfo.location.x >= space.space.x1 &&
      planetInfo.location.x <= space.space.x2 &&
      planetInfo.location.y >= space.space.y1 &&
      planetInfo.location.y <= space.space.y2;

    const planetState = {
      owner: undefined,
      ownerYakuzaSubscriptionEndTime: 0,
      lastUpdatedSaved: 0,
      startExitTime: 0,
      active: false,
      numSpaceships: planetInfo.stats.natives,
      flagTime: 0,
      travelingUpkeep: 0,
      overflow: 0,
      exiting: false,
      exitTimeLeft: 0,
      natives: true,
      capturing: false,
      inReach,
      rewardGiver: '',
      requireClaimAcknowledgement: undefined,
      metadata: {},
    };

    if (this.metadataTable[planetInfo.location.id]) {
      planetState.metadata = {...this.metadataTable[planetInfo.location.id]};
    }

    // if (planetInfo.stats.name === 'Akhew Awino') {
    //   console.log(planetInfo.stats.name);
    //   console.log({contractState});
    // }

    if (contractState) {
      planetState.natives =
        !contractState.active &&
        (contractState.owner === '0x0000000000000000000000000000000000000000' || contractState.numSpaceships == 0);
      planetState.lastUpdatedSaved = contractState.lastUpdated;
      planetState.ownerYakuzaSubscriptionEndTime = contractState.subscribedToYakuzaUntil;
      planetState.startExitTime = contractState.exitTime;
      planetState.owner = contractState.owner;
      planetState.flagTime = contractState.flagTime;
      planetState.active = contractState.active;
      planetState.rewardGiver = contractState.rewardGiver ? contractState.rewardGiver : '';
      planetState.numSpaceships = contractState.numSpaceships;
      planetState.travelingUpkeep = contractState.travelingUpkeep;
      planetState.overflow = contractState.overflow;
      planetState.exiting = !!contractState.exitTime;
      planetState.exitTimeLeft = Math.max(spaceInfo.exitDuration - (time - contractState.exitTime), 0);
      if (spaceInfo.bootstrapSessionEndTime > 0 && time > spaceInfo.bootstrapSessionEndTime) {
        if (contractState.exitTime > 0 && contractState.exitTime < spaceInfo.infinityStartTime) {
          planetState.exitTimeLeft = 0;
          planetState.exiting = false;
          planetState.owner = undefined;
        }
      }

      spaceInfo.computePlanetUpdateForTimeElapsed(planetState, planetInfo, time);
      planetState.lastUpdatedSaved = time;

      // TODO needed ?
      if (planetState.natives) {
        // TODO show num Natives
        planetState.numSpaceships = planetInfo.stats.natives;
      }
    }

    const pendingActions = pendingActionsPerPlanet[planetInfo.location.id];
    if (pendingActions) {
      for (const pendingAction of pendingActions) {
        // TODO better? we give LOADING 60 seconds counting from tx submission
        if (pendingAction.status === 'LOADING' && now() - pendingAction.action.timestamp > 60) {
          continue;
        }

        // // TODO ?
        // if (pendingAction.status === 'SUCCESS' && pendingAction.final) {
        //   continue;
        // }

        // TODO
        if (pendingAction.status === 'FAILURE') {
          continue;
        } else if (pendingAction.status === 'CANCELED') {
          continue;
        } else if (pendingAction.status === 'TIMEOUT') {
          continue;
        }

        if (!pendingAction.counted) {
          // should we ensure that if counted, status becomes SUCCESS ? see pendingActions.ts
          if (pendingAction.action.type === 'CAPTURE') {
            planetState.capturing = true;
          } else if (pendingAction.action.type === 'SEND') {
            planetState.numSpaceships -= pendingAction.action.quantity;
          } else if (pendingAction.action.type === 'EXIT') {
            planetState.exiting = true;
            planetState.exitTimeLeft = spaceInfo.exitDuration;
          }
        } else if (!pendingAction.action.acknowledged) {
          if (pendingAction.action.type === 'CAPTURE') {
            planetState.requireClaimAcknowledgement = pendingAction.id;
          }
        }
      }
    }

    return planetState;
  }

  private _call(listeners: number[], planet: PlanetState): void {
    const num = listeners.length;
    for (let i = 0; i < num; i++) {
      const listenerIndex = listeners[i];
      const listener = this.listeners[listenerIndex];
      if (listener) {
        listener.func(planet);
      }
    }
  }
}

export const planetStates = new PlanetStates();
