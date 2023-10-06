import type {PlanetInfo, PlanetState} from 'conquest-eth-common';
import {derived} from 'svelte/store';
import type {Readable} from 'svelte/store';
import {planets} from './planets';
import type {Fleet} from './fleets';
import {fleetList} from './fleets';
import {spaceInfo} from './spaceInfo';
import {now} from '$lib/time';
import {playersQuery} from './playersQuery';

export type FutureInfo = {
  state: PlanetState;
  fleet: Fleet;
  arrivalTime: number;
  accumulatedAttack: number;
  accumulatedDefense: number;
  averageAttackPower: number;
};

export type PlanetFutureState = FutureInfo[];

class PlanetFutureStateStores {
  // TODO weakmap
  private stores: Record<string, Readable<PlanetFutureState>> = {};

  futureStatesFor(planetInfo: PlanetInfo): Readable<PlanetFutureState> {
    const id = planetInfo.location.id;
    let store: Readable<PlanetFutureState> | undefined = this.stores[id];
    if (!store) {
      const planetState = planets.planetStateFor(planetInfo);
      store = derived([planetState, fleetList], ([$planetState, $fleetList]) => {
        const fleets = $fleetList.fleets.filter((v) => v.to.location.id === planetInfo.location.id);
        const futures = [];
        let lastInfo: FutureInfo | undefined;
        let futureState = $planetState;

        const currentTime = now();
        let lastTime = currentTime;
        let firstTime = true;

        for (const fleet of fleets) {
          // console.log(fleet);
          let accumulatedAttackAdded = 0;
          let accumulatedDefenseAdded = 0;
          let attackPower = fleet.from.stats.attack;

          if (fleet.arrivalTimeWanted > 0) {
            // TODO fleet Owner  a cheval : TODO, maybe order the fleet by owner ?
            if (
              lastInfo &&
              lastInfo.arrivalTime === fleet.arrivalTimeWanted &&
              !fleet.gift &&
              fleet.owner === lastInfo.fleet.owner
            ) {
              attackPower = Math.floor(
                (lastInfo.accumulatedAttack * lastInfo.averageAttackPower + fleet.quantity * fleet.from.stats.attack) /
                  (fleet.quantity + lastInfo.accumulatedAttack)
              );
              accumulatedAttackAdded = lastInfo.accumulatedAttack;
              accumulatedDefenseAdded += lastInfo.accumulatedDefense;
            }
          }

          const expectedArrivalTime = fleet.timeLeft + currentTime;
          const extraTime = expectedArrivalTime - lastTime;
          lastTime = expectedArrivalTime;

          if (extraTime > 0 || firstTime) {
            futureState = spaceInfo.computeFuturePlanetState(planetInfo, futureState, extraTime);
          }

          let newQuantity = fleet.quantity + accumulatedAttackAdded;
          if (newQuantity > Math.pow(2, 32) - 1) {
            newQuantity = Math.pow(2, 32) - 1;
          }

          const outcome = spaceInfo.outcome(
            fleet.from,
            planetInfo,
            futureState,
            newQuantity,
            fleet.timeLeft,
            playersQuery.getPlayer(fleet.fleetSender),
            playersQuery.getPlayer(fleet.owner),
            playersQuery.getPlayer(futureState.owner),
            fleet.gift,
            fleet.specific,
            {
              attackPowerOverride: attackPower,
              defense: accumulatedDefenseAdded,
            }
          );
          if (outcome.gift) {
            futureState.numSpaceships = outcome.min.numSpaceshipsLeft;
          } else {
            futureState.numSpaceships = outcome.min.numSpaceshipsLeft;
            if (outcome.min.captured) {
              futureState.owner = fleet.owner;
            }
          }
          // TODO accumulated

          if (extraTime > 0 || firstTime || outcome.gift) {
            lastInfo = {
              arrivalTime: lastTime,
              accumulatedAttack: outcome.gift ? 0 : outcome.combat.attackerLoss,
              accumulatedDefense: outcome.gift ? 0 : outcome.combat.defenderLoss,
              averageAttackPower: outcome.gift ? 0 : attackPower,
              state: futureState,
              fleet,
            };
            futures.push(lastInfo);
          } else {
            if (lastInfo) {
              lastInfo.accumulatedAttack = outcome.gift ? 0 : outcome.combat.attackerLoss;
              lastInfo.accumulatedDefense = outcome.gift ? 0 : outcome.combat.defenderLoss;
              lastInfo.averageAttackPower = outcome.gift ? 0 : attackPower;
            }
          }
          firstTime = false;
        }
        return futures;
      });
    }
    return store;
  }
}

export const planetFutureStates = new PlanetFutureStateStores();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).planetFutureStates = planetFutureStates;
}
