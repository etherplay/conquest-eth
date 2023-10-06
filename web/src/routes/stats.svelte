<script lang="ts">
  import {base} from '$app/paths';

  import NavButton from '$lib/components/navigation/NavButton.svelte';

  import {stats} from '$lib/space/stats';
  import {formatEther} from '@ethersproject/units';
  import {onMount} from 'svelte';
  onMount(() => {
    stats.start();
  });
</script>

<div class="w-full h-full bg-black text-white">
  <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>
  <div class="markdown text-white p-3">
    <h1 class="text-cyan-400"><span class="font-black">Stats</span></h1>

    {#if $stats.error}
      <span class="text-red-600">Stats are currently not available</span>
      <!-- <span class="text-red-600">{$stats.error}</span> -->
    {:else if $stats.step === 'IDLE'}
      <span class="text-yellow-600">Please wait...</span>
    {:else if $stats.step === 'LOADING'}
      <span class="text-yellow-600">Loading...</span>
    {:else}
      <label for="currentStake">Current In-Game Stake </label>
      <p class="mb-4" id="currentStake">{formatEther($stats.data.currentStakeMinusExiting)} XDAI</p>

      <!-- <label for="totalStaked">Total Staked </label>
      <p class="mb-4" id="totalStaked">{formatEther($stats.data.totalStaked)} XDAI</p> -->

      <label for="numPlanetsStaked">Number of Planet Staked </label>
      <p class="mb-4" id="numPlanetsStaked">{$stats.data.numPlanetsStakedMinusExiting} planets</p>

      <label for="numFleetsLaunched">Number of Fleets Launched</label>
      <p class="mb-4" id="numFleetsLaunched">{$stats.data.numFleetsLaunched} fleets</p>

      <label for="numFleetsResolved">Number of Fleets Resolved</label>
      <p class="mb-4" id="numFleetsResolved">{$stats.data.numFleetsResolved} fleets</p>
      <!--
      <label for="numPlanetsWithExit">Number of Planet with Exits (fully resolved or pending)</label>
      <p class="mb-4" id="numPlanetsWithExit">{$stats.data.numPlanetsWithExit} exits</p>

      <label for="numPlanetsExitFinalized">Number of Planet Exit finalized (could be done but not registered yet)</label
      >
      <p class="mb-4" id="numPlanetsExitFinalized">{$stats.data.numPlanetsExitFinalized} exits</p> -->
    {/if}
  </div>
</div>
