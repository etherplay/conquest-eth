<script lang="ts">
  import {fleetList} from '$lib/space/fleets';

  import resolveFlow from '$lib/flows/resolve';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {timeToText} from '$lib/utils';
  import {options} from '$lib/config';

  function showResolutions() {
    resolveFlow.showList();
  }
  $: fleetsToResolve = $fleetList.fleets.filter((fleet) => fleet.state === 'READY_TO_RESOLVE');
  $: min = fleetsToResolve.reduce((prev, curr) => Math.min(prev, curr.timeToResolve), 2 ** 32);

  // $: console.log(fleetsToResolve);
</script>

<!-- TODO fliter on to-->

{#if (options['showAllFleets'] && $fleetList.fleets.length > 0) || fleetsToResolve.length > 0}
  <div class="border-2 border-red-600 mt-3 mr-1 text-center text-cyan-300 ">
    <h2 class="p-1">Fleets to Resolve</h2>
    <div class="w-full h-1 bg-red-600 mt-1 mb-2 " />
    <div class="overflow-auto max-h-48 flex flex-col text-center">
      <!-- {#each fleetsToResolve as fleet} -->
      <!-- {#if agentActive && fleet.timeToResolve < $time + 5 * 60} -->
      <!-- <div class="border border-cyan-400 w-24 mx-auto">Agent Resolving...</div> -->
      <!-- {:else} -->
      <p class="m-2">
        {timeToText(min)}
        left
      </p>
      <PanelButton class="m-1" label="Resolve Fleet" on:click={() => showResolutions()}>SHOW LIST</PanelButton>
      <!-- {/if} -->
      <!-- {/each} -->
    </div>
    <div class="w-full mt-1" />
  </div>
{/if}
