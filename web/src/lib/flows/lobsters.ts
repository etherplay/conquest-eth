import {writable} from 'svelte/store';

export const lobsters = writable({
  acknowledged: false,
});
