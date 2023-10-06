<script lang="ts">
  import {Fleet, fleetList} from '$lib/space/fleets';

  import resolveFlow from '$lib/flows/resolve';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {timeToText} from '$lib/utils';
  import type {PlanetInfo} from 'conquest-eth-common';
  import Coord from '$lib/components/utils/Coord.svelte';
  import {planets} from '$lib/space/planets';
  import PlanetStateVar from '$lib/components/planets/PlanetStateVar.svelte';
  import {get} from 'svelte/store';
  import {time} from '$lib/time';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {playersQuery} from '$lib/space/playersQuery';
  import OutcomeVis from '$lib/components/fleets/OutcomeVis.svelte';
  import FleetRow from '$lib/components/fleets/FleetRow.svelte';
  import {options} from '$lib/config';

  type FleetsGroup = {destination: PlanetInfo; arrivalTimeWanted: number; fleets: Fleet[]};

  function showResolutions() {
    resolveFlow.showList();
  }
  // $: fleetsToResolve = $fleetList.fleets.filter((fleet) => fleet.state === 'READY_TO_RESOLVE');

  let fleetsGroups: FleetsGroup[] = [];
  $: {
    fleetsGroups = [];
    const map: {[group: string]: FleetsGroup} = {};
    for (const fleet of $fleetList.fleets.sort((a, b) => a.timeToResolve - b.timeToResolve)) {
      if (fleet.state === 'READY_TO_RESOLVE' || options['showAllFleets']) {
        const groupId = `${fleet.to.location.x},${fleet.to.location.y}:${fleet.arrivalTimeWanted}`;
        const existingGroup = map[groupId];
        if (existingGroup) {
          existingGroup.fleets.push(fleet);
        } else {
          const newGroup = {
            destination: fleet.to,
            arrivalTimeWanted: fleet.arrivalTimeWanted,
            fleets: [fleet],
          };
          map[groupId] = newGroup;
          fleetsGroups.push(newGroup);
        }
      }
    }
  }

  function close() {
    resolveFlow.cancel();
  }

  function outcomeFor(fleet: Fleet) {
    const toPlanetState = get(planets.planetStateFor(fleet.to));
    const playerSender = playersQuery.getPlayer(fleet.fleetSender);
    const fleetOwner = playersQuery.getPlayer(fleet.owner);
    const destinationOwner = playersQuery.getPlayer(toPlanetState.owner);
    return spaceInfo.outcome(
      fleet.from,
      fleet.to,
      toPlanetState,
      fleet.quantity,
      fleet.timeLeft,
      playerSender,
      fleetOwner,
      destinationOwner,
      fleet.gift,
      fleet.specific
    );
  }

  // $: console.log(fleetsToResolve);
</script>

<div class="z-50 fixed w-full h-full top-0 left-0 flex items-center justify-center">
  <!-- clickable dark overlay -->
  <div class="absolute w-full h-full bg-gray-900 opacity-80" />

  <!--modal-->
  <div class={`absolute border-2 w-11/12 h-5/6 bg-gray-900 max-h-screen text-red-300 border-red-500`}>
    <div
      on:click={close}
      class="modal-close absolute top-0 right-0 cursor-pointer flex flex-col items-center mt-4 mr-4 text-sm"
    >
      <svg
        class="fill-current text-white"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 18 18"
      >
        <path
          d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"
        />
      </svg>
      <span class="text-sm">(Esc)</span>
    </div>

    <div class="px-4 sm:px-6 lg:px-8">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-xl font-semibold text-gray-100 py-2 underline">Pending Resolutions</h1>
          <p class="mt-2 text-sm text-gray-300">A list of Fleets that need to be resolved!</p>
        </div>
        <!-- <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
        >Add user</button
      >
    </div> -->
      </div>
    </div>
    <div class="mt-8 flex flex-col h-5/6 w-full pl-4 pr-12">
      <div class="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
          <div class="shadow ring-1 ring-white ring-opacity-5 md:rounded-lg">
            <table class="min-w-full">
              <thead class="bg-black">
                <tr>
                  <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-100 sm:pl-6"
                    >Destination/Origin</th
                  >
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">Quantity</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">Power</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">On Planet</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">Outcome</th>
                  <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">Time Left</th>
                  <!-- <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-100">Defense</th> -->
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span class="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-black">
                {#each fleetsGroups as group}
                  <tr class="border-t border-gray-200">
                    <th
                      colspan="7"
                      scope="colgroup"
                      class="bg-gray-950 px-4 py-2 text-left text-sm font-semibold text-gray-100 sm:px-6"
                      >Destination: <Coord location={group.destination.location.id} />
                      {#if group.arrivalTimeWanted > 0}
                        (Arrival: {new Date(group.arrivalTimeWanted * 1000).toLocaleString()})
                      {/if}</th
                    >
                  </tr>

                  {#each group.fleets as fleet}
                    <tr class="border-t border-gray-700">
                      <FleetRow {fleet} outcome={outcomeFor(fleet)} />
                    </tr>
                  {/each}
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
