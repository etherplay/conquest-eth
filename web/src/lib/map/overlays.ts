import {writable} from 'svelte/store';

export type Overlays = {
  alliances: boolean;
  fleets: boolean;
  planetOwners: 'OnlyYou' | 'OnlyAllies' | 'Everyone' | 'None';
  sectors: boolean;
};

export const overlays = writable<Overlays>({
  alliances: false,
  fleets: true,
  planetOwners: 'Everyone',
  sectors: false,
});
