import _contractsInfos from '$lib/contracts.json';
import {readable} from 'svelte/store';

export const initialContractsInfos = _contractsInfos;

let _set;
export const contractsInfos = readable(_contractsInfos, (set) => {
  _set = set;
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    try {
      _set(newModule.initialContractsInfos);
    } catch (e) {
      console.error('_set contracts', e);
    }
  });
}
