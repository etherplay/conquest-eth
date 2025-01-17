import {initialContractsInfos} from '$lib/blockchain/contracts';
import {writable} from 'svelte/store';

const id =
  'plugins_' +
  initialContractsInfos.contracts.OuterSpace.address +
  (initialContractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
    ? ':' + initialContractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
    : '');

let pluginsList = [];
const original = pluginsList;
if (typeof localStorage !== `undefined`) {
  const strFromStorage = localStorage.getItem(id);
  if (strFromStorage) {
    try {
      pluginsList = JSON.parse(strFromStorage);
    } catch (e) {
      console.error(e);
    }
  }
}

let defaultPluginURL = typeof window !== 'undefined' && (import.meta.env.VITE_DEFAULT_SALE_PLUGIN_IFRAME as string);
if (defaultPluginURL) {
  if (!defaultPluginURL.startsWith('http://')) {
    defaultPluginURL = `${location.protocol}//${location.host}${defaultPluginURL}`;
  }
}

if (defaultPluginURL) {
  const DEFAULT_SALE_PLUGIN_ID = '_conquest_default_sale_plugin';

  const defaultSalePlugin = {
    id: DEFAULT_SALE_PLUGIN_ID,
    name: 'Basic Spaceship Marketplace',
    // https://basic-marketplace-dev.conquest.etherplay.io/
    iframe: defaultPluginURL,
    config: {
      actions: [
        {
          title: 'Market',
          action: 'show_planet',
          panelConditions: ['owner', 'planet:basic_sale'],
          mapConditions: ['planet:basic_sale'],
        },
      ],
    },
  };

  if (original === pluginsList) {
    console.log(`adding default plugin...`);
    pluginsList.push(defaultSalePlugin);
  } else {
    const foundIndex = pluginsList.findIndex((v) => v.id === DEFAULT_SALE_PLUGIN_ID);
    if (foundIndex >= 0) {
      console.log(`updating default plugin...`);
      pluginsList[foundIndex] = defaultSalePlugin;
    }
  }
}

const store = writable(pluginsList);

export default store;

store.subscribe((newValue) => {
  if (typeof localStorage !== `undefined`) {
    localStorage.setItem(id, JSON.stringify(newValue));
  }
});
