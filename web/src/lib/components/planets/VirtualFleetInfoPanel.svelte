<script lang="ts">
  import {planets} from '$lib/space/planets';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import selection from '$lib/map/selection';
  import PlanetStats from './PlanetStats.svelte';
  import {timeToText} from '$lib/utils';
  import VirtualFleetActionPanel from './VirtualFleetActionPanel.svelte';
  import PanelButton from '../generic/PanelButton.svelte';
  import sendFlow from '$lib/flows/send';

  export let coords: {x: number; y: number};
  export let pickNeeded: 'destination' | 'origin';

  $: planetInfo = spaceInfo.getPlanetInfo(coords.x, coords.y);
  $: planetState = planets.planetStateFor(planetInfo);

  $: selectedPlanetInfo = $selection ? spaceInfo.getPlanetInfo($selection.x, $selection.y) : undefined;

  function cancelSend() {
    sendFlow.cancel();
  }

  $: timeItTakes = selectedPlanetInfo ? spaceInfo.timeToArrive(selectedPlanetInfo, planetInfo) : undefined;
</script>

<div
  class="z-10 absolute right-0 top-14 inline-block w-36 md:w-48 bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300 m-4 text-sm"
>
  <PlanetStats copiedDirection="left" {planetState} {planetInfo} />

  <div class="w-full h-1 bg-cyan-300 mt-4 mb-2" />

  <div class="flex flex-col text-center text-xs">
    {#if !$selection}
      <p class="text-center font-black">
        {#if pickNeeded === 'destination'}Pick the Destination{:else}Pick the Origin{/if}
      </p>
    {/if}

    {#if selectedPlanetInfo}
      <p class="m-1 text-sm text-yellow-400">
        Will take {timeToText(timeItTakes)}
      </p>
      <VirtualFleetActionPanel {planetState} {planetInfo} {timeItTakes} close={() => selection.unselect()} />
    {/if}

    <PanelButton label="Cancel" class="m-2" on:click={cancelSend}>
      <div class="w-20">Cancel</div>
    </PanelButton>
  </div>
</div>
