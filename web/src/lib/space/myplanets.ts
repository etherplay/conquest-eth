import {wallet} from '$lib/blockchain/wallet';
import type {PlanetInfo} from 'conquest-eth-common';
import {locationToXY} from 'conquest-eth-common';
import type {Readable} from 'svelte/store';
import {derived} from 'svelte/store';
import {spaceQueryWithPendingActions} from './optimisticSpace';
import {spaceInfo} from './spaceInfo';
import type {PlanetContractState} from './spaceQuery';

// export const myplanets: Readable<{info: PlanetInfo; state: PlanetContractState}[]> = derived(
// export const myplanets: Readable<PlanetContractState[]> = derived(
export const myplanetInfos: Readable<PlanetInfo[]> = derived(
  [spaceQueryWithPendingActions],
  ([$spaceQueryWithPendingActions]) => {
    const planets = $spaceQueryWithPendingActions.queryState?.data?.planets;
    if (planets) {
      return planets
        .filter((v) => v.owner?.toLowerCase() === wallet.address?.toLowerCase())
        .map((v) => {
          const pos = locationToXY(v.id);
          return spaceInfo.getPlanetInfo(pos.x, pos.y);
        });
      // .map((v) => {
      //   const pos = locationToXY(v.id);
      //   return {
      //     info: spaceInfo.getPlanetInfo(pos.x, pos.y),
      //     state: v,
      //   };
      // });
    }
    return [];
  }
);
