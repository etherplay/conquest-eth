<script lang="ts">
  import type {Outcome} from 'conquest-eth-common';
  import {timeToText} from '$lib/utils';
  import PlanetStateVar from '../planets/PlanetStateVar.svelte';
  import Coord from '../utils/Coord.svelte';
  import resolveFlow from '$lib/flows/resolve';
  import type {Fleet} from '$lib/space/fleets';
  import {options} from '$lib/config';

  export let fleet: Fleet;
  export let outcome: Outcome;

  function resolve(fleet: Fleet, force = false) {
    resolveFlow.resolve(fleet, 'SHOW_LIST', force);
  }
</script>

<td
  class={`whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium ${
    outcome.gift ? 'text-green-500' : 'text-red-500'
  } sm:pl-6`}>Origin <Coord location={fleet.from.location.id} /></td
>
<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-100">{fleet.quantity}</td>
<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-100"
  >{#if outcome.gift}
    <p class="text-green-500">gift</p>
  {:else}{fleet.from.stats.attack} VS {fleet.to.stats.defense}{/if}</td
>
<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-100"
  ><PlanetStateVar planet={fleet.to} field="numSpaceships" /></td
>
<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-100">
  <p class={`${outcome.gift || outcome.min.captured ? 'text-green-500' : 'text-red-500'}`}>
    {outcome.min.numSpaceshipsLeft}
  </p>
</td>
<td class="whitespace-nowrap px-3 py-4 text-sm text-gray-100">{timeToText(fleet.timeToResolve)}</td>
<td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
  <button
    on:click={() => resolve(fleet)}
    class="border-2 border-orange-500 rounded-md p-2 text-orange-600 hover:text-orange-900 hover:border-orange-900"
    >Resolve<span class="sr-only">, {'x,y'}</span></button
  >
</td>

{#if options['forceResolve']}
  <td
    ><button
      on:click={() => resolve(fleet, true)}
      class="border-2 border-red-500 rounded-md p-2 text-orange-600 hover:text-orange-900 hover:border-orange-900"
      >Force<span class="sr-only">, {'x,y'}</span></button
    ></td
  >
{/if}
