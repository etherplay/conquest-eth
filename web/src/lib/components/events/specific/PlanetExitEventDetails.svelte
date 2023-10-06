<script lang="ts">
  import type {PlanetExitParsedEvent} from '$lib/space/subgraphTypes';
  import Blockie from '$lib/components/account/Blockie.svelte';
  import Coord from '$lib/components/utils/Coord.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {time} from '$lib/time';

  import {timeToText} from '$lib/utils';
  import type {PlanetInfo} from 'conquest-eth-common';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {wallet} from '$lib/blockchain/wallet';

  export let event: PlanetExitParsedEvent;

  let owner: string | undefined;
  let origin: PlanetInfo | undefined;
  let walletIsOwner: boolean;

  let timeLeft;
  let interrupted;
  let complete;

  $: {
    owner = event.owner.id;
    origin = spaceInfo.getPlanetInfoViaId(event.planet.id);
    const walletAddress = $wallet.address?.toLowerCase();
    walletIsOwner = walletAddress === owner;

    const timePassedSinceExit = $time - event.exitTime;
    timeLeft = 0;
    complete = false;
    interrupted = event.interupted;
    if (!interrupted) {
      if (timePassedSinceExit > spaceInfo.exitDuration) {
        complete = true;
      } else {
        timeLeft = spaceInfo.exitDuration - timePassedSinceExit;
      }
    }
  }
</script>

<div class="bg-black shadow sm:rounded-lg">
  <div class="px-4 py-5 sm:px-6">
    <h3 class="text-lg leading-6 font-medium text-red-400">
      {#if walletIsOwner}
        {#if interrupted}
          <span class="text-red-500"
            >Your Exit Procedure for <Coord location={origin.location.id} /> was interrupted.</span
          >
        {:else if complete}
          <span class="text-green-500"
            >Your Exit Procedure for <Coord location={origin.location.id} /> is complete.</span
          >
        {:else}
          <span class="text-green-500"
            >Your Exit Procedure for <Coord location={origin.location.id} /> is underway. It complets in {timeToText(
              timeLeft
            )}</span
          >
        {/if}
      {:else if interrupted}
        <span class="text-gray-100">Exit Procedure for <Coord location={origin.location.id} /> was interrupted.</span>
      {:else if complete}
        <span class="text-gray-100">Exit Procedure for <Coord location={origin.location.id} /> is complete.</span>
      {:else}
        <span class="text-gray-100"
          >Exit Procedure for <Coord location={origin.location.id} /> is underway. It complets in {timeToText(
            timeLeft
          )}</span
        >
      {/if}
    </h3>
    <p class="mt-1 max-w-2xl text-sm text-gray-500">{timeToText($time - event.timestamp, {compact: true})} ago</p>
  </div>
  <div class="border-t border-gray-800 px-4 py-5 sm:p-0">
    <dl class="sm:divide-y sm:divide-gray-800">
      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Origin</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <p class="mb-1"><Coord location={origin.location.id} /> {origin.stats.name}</p>
        </dd>
      </div>

      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Owner</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <p class="mb-1"><Blockie address={owner} /></p>
        </dd>
      </div>
      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Stake</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <p class="mb-1">{origin.stats.stake / 10000} <PlayCoin class="w-6 h-6 inline-block" /></p>
        </dd>
      </div>

      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Transaction</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <a
            href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${event.transaction.id}`}
            target="_blank"
            class="text-indigo-600 hover:text-indigo-100">{event.transaction.id}</a
          >
        </dd>
      </div>
    </dl>
  </div>
</div>
