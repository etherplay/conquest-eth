<script lang="ts">
  export let planet: PlanetInfo;
  export let field: string;

  import {planets} from '$lib/space/planets';
  import type {PlanetInfo} from 'conquest-eth-common';

  $: planetState = planets.planetStateFor(planet);
</script>

{$planetState[field]}
