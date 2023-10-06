<script lang="ts">
  export let address: string;
  export let offset: number = 0;

  export let _class = '';
  export {_class as class};

  import {Blockie} from '$lib/utils/eth/blockie';

  $: uri = Blockie.getURI(address, offset);
</script>

<div
  class={_class}
  style={`image-rendering: -moz-crisp-edges;image-rendering: -webkit-crisp-edges;image-rendering: pixelated;image-rendering: crisp-edges;background-image: url(${uri});background-size:100% 100%;white-space: nowrap;overflow: hidden;`}
/>
