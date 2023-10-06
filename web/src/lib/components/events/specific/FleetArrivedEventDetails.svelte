<script lang="ts">
  import type {FleetArrivedParsedEvent} from '$lib/space/subgraphTypes';
  import FleetArrivedEventAsFailedCaptureDetails from './FleetArrivedEventAsFailedCaptureDetails.svelte';
  import FleetArrivedEventAsGiftDetails from './FleetArrivedEventAsGiftDetails.svelte';
  import FleetArrivedEventAsSuccessfulCaptureDetails from './FleetArrivedEventAsSuccessfulCaptureDetails.svelte';
  export let event: FleetArrivedParsedEvent;
</script>

{#if event.gift}
  <FleetArrivedEventAsGiftDetails {event} />
{:else if event.won}
  <FleetArrivedEventAsSuccessfulCaptureDetails {event} />
{:else}
  <FleetArrivedEventAsFailedCaptureDetails {event} />
{/if}
