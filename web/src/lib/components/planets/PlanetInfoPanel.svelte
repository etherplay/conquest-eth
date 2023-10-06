<script lang="ts">
  import {planets} from '$lib/space/planets';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import PlanetActionPanel from '$lib/components/planets/PlanetActionPanel.svelte';
  import selection from '$lib/map/selection';
  import PlanetStats from './PlanetStats.svelte';

  export let coords: {x: number; y: number};
  function close() {
    selection.unselect();
  }

  $: planetInfo = spaceInfo.getPlanetInfo(coords.x, coords.y);

  $: planetState = planets.planetStateFor(planetInfo);
</script>

<div
  class="absolute inline-block w-36 md:w-48 bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300 m-4 text-sm"
>
  <PlanetStats {planetState} {planetInfo} />
  <div class="w-full h-1 bg-cyan-300 mt-4 mb-2" />
  <PlanetActionPanel {close} {coords} />
</div>
