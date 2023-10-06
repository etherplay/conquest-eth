<script lang="ts">
  import {myevents} from '$lib/space/myevents';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import type {MyEvent} from '$lib/space/myevents';
  import {clickOutside} from '$lib/utils/clickOutside';
  import {errors} from '$lib/space/errors';
  import type {SpaceError} from '$lib/space/errors';
  import selection from '$lib/map/selection';
  import {xyToLocation} from 'conquest-eth-common';
  import {camera} from '$lib/map/camera';

  let isToggled = false;

  function onPlanetEventSelected(event: {location: string}) {
    selection.selectViaId(event.location);
    const planet = spaceInfo.getPlanetInfoViaId(event.location);
    camera.navigate(planet.location.globalX, planet.location.globalY, 10);
  }

  let planetDict: {[id: string]: number};
  let planetEvents: {location: string; error: boolean; length: number}[] = [];
  $: {
    planetDict = {};
    planetEvents = [];
    for (let error of $errors) {
      const errorLocation = xyToLocation(error.location.x, error.location.y);
      let index = planetDict[errorLocation];
      if (!(index === 0 || index > 0)) {
        index = planetEvents.length;
        planetEvents.push({location: errorLocation, error: true, length: 1});
        planetDict[errorLocation] = index;
      } else {
        planetEvents[index].error = true;
        planetEvents[index].length++;
      }
    }
    for (let event of $myevents) {
      let index = planetDict[event.location];
      if (!(index === 0 || index > 0)) {
        index = planetEvents.length;
        planetEvents.push({location: event.location, error: false, length: 1});
        planetDict[event.location] = index;
      } else {
        planetEvents[index].length++;
      }
    }
  }
</script>

<div class="flex-col" use:clickOutside on:click_outside={() => (isToggled = false)}>
  <div
    class="top-0 md:p-3 p-1 w-32 text-center relative bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300 mt-4 text-sm"
  >
    <button on:click={() => (isToggled = !isToggled)} class="text-white md:w-full">
      Events ({$myevents.length + $errors.length})
    </button>
  </div>
  {#if isToggled}
    <div
      class="top-0 md:p-3 text-center md:absolute bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300 md:mt-16 text-sm"
    >
      {#if planetEvents.length > 0}
        <ul class="overflow-auto max-h-32 w-48" style="cursor: pointer;">
          {#each planetEvents as planetEvent}
            {#if planetEvent.error}
              <li style="width: 100%" class="text-red-300 my-3" on:click={() => onPlanetEventSelected(planetEvent)}>
                * An error ocured on planet {spaceInfo.getPlanetInfoViaId(planetEvent.location).stats.name} ({planetEvent.length})
              </li>
            {:else}
              <li style="width: 100%" class="text-green-600 my-3" on:click={() => onPlanetEventSelected(planetEvent)}>
                * {spaceInfo.getPlanetInfoViaId(planetEvent.location).stats.name} ({planetEvent.length})
              </li>
            {/if}
          {/each}
        </ul>
      {:else}
        <h4 style="margin: 10px 0">No events yet</h4>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* width */
  ::-webkit-scrollbar {
    width: 8px;
  }

  /* Track */
  ::-webkit-scrollbar-track {
    background: rgba(17, 24, 39, 0.8);
  }

  /* Handle */
  ::-webkit-scrollbar-thumb {
    background: #539ff0;
    border-radius: 100vh;
    border: 3px solid #edf2f7;
  }

  /* Handle on hover */
  ::-webkit-scrollbar-thumb:hover {
    background: #4690f0;
  }
</style>
