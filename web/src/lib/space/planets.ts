import type {PlanetInfo, PlanetState} from 'conquest-eth-common';
import {writable} from 'svelte/store';
import type {Readable, Writable} from 'svelte/store';
import {planetStates} from './planetStates';

class PlanetStateStores {
  private stores: Record<string, Writable<PlanetState>> = {};

  planetStateFor(planetInfo: PlanetInfo): Readable<PlanetState> {
    const id = planetInfo.location.id;
    let store: Writable<PlanetState> | undefined = this.stores[id];
    if (!store) {
      store = writable<PlanetState>(undefined, (set) => {
        this.stores[id] = store as Writable<PlanetState>;
        const listenerIndex = planetStates.onPlannetUpdates(planetInfo, (planet: PlanetState) => {
          set(planet);
        });
        return () => {
          planetStates.switchOffPlanetUpdates(listenerIndex);
          // delete this.stores[id]; // TODO ?
        };
      });
    }
    return store;
  }
}

export const planets = new PlanetStateStores();
