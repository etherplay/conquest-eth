<script lang="ts">
  import type {GenericParsedEvent} from '$lib/space/subgraphTypes';
  import {time} from '$lib/time';
  import {timeToText} from '$lib/utils';
  import FleetArrivedEventDetails from './specific/FleetArrivedEventDetails.svelte';
  import FleetSentEventDetails from './specific/FleetSentEventDetails.svelte';
  import PlanetExitEventDetails from './specific/PlanetExitEventDetails.svelte';
  import PlanetStakeEventEventDetails from './specific/PlanetStakeEventEventDetails.svelte';

  // TODO : remove EventInfo and use EventDetails.svelte instead
  export let event: GenericParsedEvent;
</script>

{#if event.__typename === 'FleetArrivedEvent'}
  <FleetArrivedEventDetails {event} />
{:else if event.__typename === 'PlanetExitEvent'}
  <PlanetExitEventDetails {event} />
{:else if event.__typename === 'FleetSentEvent'}
  <FleetSentEventDetails {event} />
{:else if event.__typename === 'PlanetStakeEvent'}
  <PlanetStakeEventEventDetails {event} />
  <!-- {:else if event.__typename === 'PlanetTransferEvent'}
  <PlanetStakeEventEventDetails {event} /> -->
  <!-- {:else if event.__typename === 'ExitCompleteEvent'}
  <FleetArrivedEventDetails {event} /> -->
  <!-- {:else if event.__typename === 'StakeToWithdrawEvent'}
  <FleetArrivedEventDetails {event} /> -->
  <!-- {:else if event.__typename === 'TravelingUpkeepReductionFromDestructionEvent'}
  <FleetArrivedEventDetails {event} /> -->
{:else}
  <div class="bg-black shadow sm:rounded-lg">
    <div class="px-4 py-5 sm:px-6">
      <h3 class="text-lg leading-6 font-medium text-green-400">
        {event.__typename}
      </h3>

      <p class="mt-1 max-w-2xl text-sm text-gray-500">{timeToText($time - event.timestamp, {compact: true})} ago</p>
    </div>
    <div class="border-t border-gray-800 px-4 py-5 sm:p-0">
      <dl class="sm:divide-y sm:divide-gray-800">
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
{/if}
