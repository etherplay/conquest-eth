<script lang="ts">
  export let location: string;
  // export let linkOnly: boolean = false;

  import {url} from '$lib/utils/url';
  import {coordFromXYObject, locationToXY} from 'conquest-eth-common';
  import Copiable from '../generic/Copiable.svelte';
  import Tooltip from '../generic/Tooltip.svelte';

  $: xy = locationToXY(location);
  $: coordStr = coordFromXYObject(xy);
</script>

<!-- {#if link} -->
<Tooltip>
  <div slot="tooltip">
    <p class="m-1">
      <a class="underline" href={url(`?x=${xy.x}&y=${xy.y}`)} style="cursor: pointer;">navigate to</a>
    </p>
  </div>
  <Copiable text={`${coordStr}`}>
    <span style="user-select: all; cursor: pointer;" class="border">{coordStr}</span>
  </Copiable>
</Tooltip>
<!-- {:else}
  <Copiable text={`${coordStr}`}>
    <span style="user-select: all; cursor: pointer;" class="border">{coordStr}</span>
  </Copiable>
{/if} -->
