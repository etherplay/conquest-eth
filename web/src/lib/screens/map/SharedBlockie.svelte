<script lang="ts">
  import {initialContractsInfos} from '$lib/blockchain/contracts';

  export let address: string;
  export let offset: number = 0;
  export let style: string | undefined = undefined;

  import {Blockie} from '$lib/utils/eth/blockie';

  const yakuza = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAFhJREFUGJWNzcsNwkAUQ9EzKCVMDZlqplqqITW8HsyCJCgICby6lvwRMwiSGkmNtzezQExq0/oDpAZ9BW1PUpuL+qq5vwrH/DduOzivOJtw80P/B475T34CxEMrv3zny/YAAAAASUVORK5CYII=`;
  const pirate =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAAXNSR0IArs4c6QAAAC5JREFUCJljYCAeXK/excDAwPL//38scgy7GOASaAwmXAYyYjWKkZERoReZxAcA+csbkMtRTQoAAAAASUVORK5CYII=';

  let specificURI: string | undefined;
  if (
    address.toLowerCase() === '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead' ||
    address.toLowerCase() === '0x35258bb585e18a92756d87d9990c050d7a99a207'
  ) {
    specificURI = pirate;
  } else if (
    (initialContractsInfos as any).contracts.Yakuza &&
    (initialContractsInfos as any).contracts.Yakuza.address.toLowerCase() === address.toLowerCase()
  ) {
    specificURI = yakuza;
  }

  $: uri = specificURI || Blockie.getURI(address, offset);
</script>

<img {style} src={uri} alt={address} />

<style>
  img {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
