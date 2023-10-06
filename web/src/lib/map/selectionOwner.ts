import {planets} from '$lib/space/planets';
import type {Player} from '$lib/space/playersQuery';
import {playersQuery} from '$lib/space/playersQuery';
import {spaceInfo} from '$lib/space/spaceInfo';
import type {PlanetInfo, PlanetState} from 'conquest-eth-common';
import type {Readable} from 'svelte/store';
import {writable} from 'svelte/store';
import selection from './selection';

const store = writable<Player | undefined>(undefined);

let stopSubscribtion: () => void | undefined;
let planetInfo: PlanetInfo | undefined;
let planetState: Readable<PlanetState> | undefined;

selection.subscribe((v) => {
  if (!v) {
    if (stopSubscribtion) {
      stopSubscribtion();
      stopSubscribtion = undefined;
    }
    planetInfo = undefined;
    planetState = undefined;
    store.set(undefined);
  } else {
    const newPlanetInfo = spaceInfo.getPlanetInfo(v.x, v.y);
    if (newPlanetInfo.location.id !== planetInfo?.location.id) {
      if (stopSubscribtion) {
        stopSubscribtion();
        stopSubscribtion = undefined;
      }
      planetInfo = newPlanetInfo;
      planetState = planets.planetStateFor(planetInfo);
      stopSubscribtion = planetState.subscribe(($planetState) => {
        if ($planetState && $planetState.owner && $planetState.owner != '0x0000000000000000000000000000000000000000') {
          store.set(playersQuery.getPlayer($planetState.owner));
        } else {
          store.set(undefined);
        }
      });
    }
  }
});

// const store = derived([selection, playersQuery], ([$selection, $playersQuery]) => {
//   if (!selection) {
//     return undefined
//   }
// });

export default store;
