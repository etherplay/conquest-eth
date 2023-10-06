import {account} from '$lib/account/account';
import type {PlanetInfo, PlanetState} from 'conquest-eth-common';
import type {Readable} from 'svelte/store';
import {get, writable} from 'svelte/store';

export type Action = {
  title: string;
  action: string;
  panelConditions: (string | string[])[];
  mapConditions: (string | string[])[];
};
export type PluginConfig = {actions: Action[]};

const pluginsActivated: {src: string; window: Window; config: PluginConfig}[] = [];

export type ButtonInfo = {
  src: string;
  title: string;
  panelConditions: (string | string[])[];
  mapConditions: (string | string[])[];
};

const showPlanetButtonsStore = writable<ButtonInfo[]>([]);

export const showPlanetButtons: Readable<ButtonInfo[]> = {
  subscribe: showPlanetButtonsStore.subscribe.bind(showPlanetButtonsStore),
};

function addButton(arr: ButtonInfo[], actionToAdd: string, actions: Action[], src: string) {
  for (const action of actions) {
    if (action.action === actionToAdd) {
      arr.push({
        src,
        title: action.title,
        panelConditions: action.panelConditions,
        mapConditions: action.mapConditions,
      });
      break;
    }
  }
}

function removeButton(arr: ButtonInfo[], src: string) {
  const foundIndex = arr.findIndex((v) => v.src === src);
  if (foundIndex >= 0) {
    arr.splice(foundIndex, 1);
  }
}

export type ConditionData = {account: string; planetState: PlanetState; planetInfo: PlanetInfo};

function matchCondition(condition: string, data: ConditionData): boolean {
  if (condition === 'owner') {
    return data.account?.toLowerCase() === data.planetState?.owner?.toLowerCase();
  } else if (condition.startsWith('planet')) {
    const split = condition.split(':');
    return data.planetState?.metadata[split[1]] !== undefined;
  }
}

export function matchConditions(conditions: (string | string[])[], data: ConditionData): boolean {
  for (const orCondition of conditions) {
    if (typeof orCondition === 'string') {
      if (matchCondition(orCondition, data)) {
        return true;
      }
    } else {
      for (const andCondition of orCondition) {
        if (!matchCondition(andCondition, data)) {
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

const pluginShowingStore = writable(undefined);

let unsubscribeFromPlanetState: () => void | undefined;
let unsubscribeFromAccount: () => void | undefined;

export const pluginShowing = {
  subscribe: pluginShowingStore.subscribe.bind(pluginShowingStore),
  showPlanet(pluginSrc: string, planetStateStore: Readable<PlanetState>, planetInfo: PlanetInfo) {
    const plugin = pluginsActivated.find((v) => v.src === pluginSrc);
    pluginShowingStore.set(pluginSrc);

    function update() {
      plugin.window.postMessage(
        JSON.stringify({
          type: 'show_planet',
          planet: {info: planetInfo, state: get(planetStateStore)},
          account: get(account).ownerAddress,
        }),
        plugin.src
      );
    }
    update();
    unsubscribeFromPlanetState = planetStateStore.subscribe((v) => {
      update();
    });
    unsubscribeFromAccount = account.subscribe((v) => {
      update();
    });
  },
  hide() {
    if (unsubscribeFromPlanetState) {
      unsubscribeFromPlanetState();
      unsubscribeFromPlanetState = undefined;
    }
    if (unsubscribeFromAccount) {
      unsubscribeFromAccount();
      unsubscribeFromAccount = undefined;
    }
    pluginShowingStore.set(undefined);
  },
};

export function registerIframe(src: string, w: Window, config: PluginConfig) {
  const plugin = pluginsActivated.find((v) => v.src === src);
  if (!plugin) {
    pluginsActivated.push({src: src, window: w, config});
    if (config) {
      const currentInfoButtons = get(showPlanetButtonsStore);
      addButton(currentInfoButtons, 'show_planet', config.actions, src);
      showPlanetButtonsStore.set(currentInfoButtons);
    }
  } else {
    console.error(`plugin with src ${src} already registered`);
  }
}

export function unregisterIframe(src: string) {
  const plugin = pluginsActivated.findIndex((v) => v.src === src);
  if (plugin >= 0) {
    const currentInfoButtons = get(showPlanetButtonsStore);
    removeButton(currentInfoButtons, src);
    showPlanetButtonsStore.set(currentInfoButtons);
    pluginsActivated.splice(plugin, 1);
  } else {
    console.error(`no plugin with src ${src} found`);
  }
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).pluginShowing = pluginShowing;
}
