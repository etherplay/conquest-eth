<script lang="ts">
  import {base} from '$app/paths';

  import {globalLogs} from '$lib/space/globalLogs';
  import {onMount} from 'svelte';
  import LogRow from '$lib/components/events/LogRow.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import type {GenericParsedEvent} from '$lib/space/subgraphTypes';
  import Modal from '$lib/components/generic/Modal.svelte';
  import EventDetails from '$lib/components/events/EventDetails.svelte';
  import {planetStates} from '$lib/space/planetStates';
  import {wallet} from '$lib/blockchain/wallet';
  import Counter from '$lib/components/generic/Counter.svelte';
  import {page} from '$app/stores';
  onMount(() => {
    let logPeriod: number | undefined;
    let logPeriodParam = $page.url.searchParams.get('logPeriod');
    if (logPeriodParam) {
      logPeriod = parseInt(logPeriodParam);
    }

    globalLogs.start(logPeriod);
    planetStates.start();
  });

  $: logs = $globalLogs?.data ? $globalLogs.data : [];

  let onlySender: boolean = false;
  let filterAddress: string | undefined;
  let filterType: string | undefined;
  let filterOrigin: string | undefined;
  let filterDestination: string | undefined;
  let onlyUnresolved: boolean = false;
  let onlyPlayer: boolean = false;
  let originRadius = 0;
  let destinationRadius = 0;
  let orLocation: boolean = true;

  function onOnlyPlayerChanged(e) {
    if (onlyPlayer) {
      filterAddress = $wallet.address;
    } else {
      filterAddress = undefined;
      onlySender = false;
    }
  }

  function onFilterAddressChanged(e) {
    onlyPlayer = false;
    if (!filterAddress || filterAddress === '') {
      onlySender = false;
    }
  }

  let eventToShowDetails: GenericParsedEvent | undefined;
  function showDetails(event: GenericParsedEvent) {
    eventToShowDetails = event;
  }
  function closeDetals() {
    eventToShowDetails = undefined;
  }
</script>

<div class="px-4 sm:px-6 lg:px-8">
  <div class="sm:flex sm:items-center sticky top-0 bg-black z-10">
    <div class="sm:flex-auto">
      <h1 class="text-xl font-semibold text-gray-100 mt-4">Logs</h1>
      <p class="mt-2 text-sm text-gray-300">
        {#if $globalLogs.error}
          {$globalLogs.error}
        {:else if $globalLogs.step === 'IDLE'}
          Please wait...
        {:else if $globalLogs.step === 'LOADING'}
          Loading...
        {:else}
          Game events
        {/if}
      </p>
    </div>
    <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
      <!-- <button
        type="button"
        class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
        >Back To Game</button
      > -->
      <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>
    </div>
  </div>
  <div class="mt-8 flex flex-col">
    <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
        <div class="overflow-hidden shadow ring-1 ring-white ring-opacity-5 md:rounded-lg">
          <table class="min-w-full divide-y divide-gray-700">
            <thead class="bg-gray-950">
              <tr>
                <th
                  scope="col"
                  class="whitespace-nowrap py-3.5 pl-4 pr-3 text-center text-sm font-semibold text-gray-100 sm:pl-6"
                  >Time</th
                >
                <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-100"
                  >Sender</th
                >
                <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-100"
                  >Type</th
                >
                <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-100"
                  >Origin</th
                >
                <!-- <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500" /> -->
                <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-100"
                  >Destination</th
                >
                <!-- <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-100"
                  >Quantity</th
                > -->
                <th
                  colspan="2"
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-100">Outcome</th
                >
                <th scope="col" class="relative whitespace-nowrap text-right py-3.5 pl-3 pr-4 sm:pr-6" />
              </tr>
            </thead>
            <thead class="bg-gray-950">
              <tr>
                <th
                  scope="col"
                  class="whitespace-nowrap py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-500 sm:pl-6"
                >
                  <label class="text-xs" for="onlySender">player: </label><input
                    type="text"
                    onClick="this.select();"
                    name="filterAddress"
                    class="bg-black text-white ring-1 ring-gray-500 m-2 w-20"
                    bind:value={filterAddress}
                    on:change={onFilterAddressChanged}
                  /><br />
                  <label class="text-xs" for="onlySender">My Events: </label><input
                    class="w-3 h-3"
                    name="onlySender"
                    type="checkbox"
                    disabled={!$wallet.address}
                    bind:checked={onlyPlayer}
                    on:change={onOnlyPlayerChanged}
                  />
                </th>
                <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500">
                  <input
                    class="w-3 h-3"
                    name="onlySender"
                    type="checkbox"
                    disabled={!filterAddress}
                    bind:checked={onlySender}
                  />
                </th>
                <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500"
                  ><input
                    type="text"
                    onClick="this.select();"
                    name="filterType"
                    class="bg-black text-white ring-1 ring-gray-500 m-2 w-20"
                    bind:value={filterType}
                  /></th
                >
                <th
                  colspan="2"
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500"
                >
                  <!-- <p>location</p> -->
                  <input
                    type="text"
                    onClick="this.select();"
                    name="filterOrigin"
                    class="bg-black text-white ring-1 ring-gray-500 m-2 w-20"
                    bind:value={filterOrigin}
                  /><br />

                  <Counter min={0} class="w-20 h-6" bind:value={originRadius} />
                </th>
                <!-- <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500">
                  Or<br />
                  <input
                    class="w-3 h-3"
                    name="orLocation"
                    type="checkbox"
                    disabled={!filterDestination || !filterOrigin}
                    bind:checked={orLocation}
                  />
                </th> -->
                <!-- <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500">
                  <input
                    type="text"
                    onClick="this.select();"
                    name="filterDestination"
                    class="bg-black text-white ring-1 ring-gray-500 m-2 w-20"
                    bind:value={filterDestination}
                  />
                  <input type="checkbox" bind:value={orLocation} />
                  <br />

                  <Counter min={0} class="w-20 h-6" bind:value={destinationRadius} />
                </th> -->
                <!-- <th scope="col" class="whitespace-nowrap px-2 py-3.5 text-center text-sm font-semibold text-gray-500" /> -->
                <th
                  colspan="2"
                  scope="col"
                  class="whitespace-nowrap px-2 py-3.5 text-left text-sm font-semibold text-gray-500"
                />
                <th scope="col" class="relative whitespace-nowrap py-3.5 pl-3 pr-4 sm:pr-6"
                  ><label class="text-xs" for="onlySender">unresolved: </label><input
                    class="w-3 h-3"
                    name="onlySender"
                    type="checkbox"
                    bind:checked={onlyUnresolved}
                  /></th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800 bg-black">
              {#if $globalLogs.step === 'LOADING'}
                <tr>
                  <td colspan="7">
                    <p class="text-xl text-orange-500">LOADING....</p>
                  </td>
                </tr>
              {:else}
                {#each logs as event (event.id)}
                  <tr>
                    <LogRow
                      on:click={() => showDetails(event)}
                      {filterType}
                      {filterAddress}
                      {filterDestination}
                      {filterOrigin}
                      {onlySender}
                      {onlyUnresolved}
                      {originRadius}
                      {destinationRadius}
                      {orLocation}
                      {event}
                    />
                  </tr>
                {/each}
              {/if}
              <!-- More transactions... -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

{#if eventToShowDetails}
  <Modal maxWidth="max-w-screen-xl" on:close={closeDetals}>
    <EventDetails event={eventToShowDetails} />
  </Modal>
{/if}
