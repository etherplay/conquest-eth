<script lang="ts">
  import type {ExitCompleteEvent, ExternalFleetEvent, InternalFleetEvent, MyEvent} from '$lib/space/myevents';
  import ErrorDetails from './ErrorDetails.svelte';
  import EventInfoDetailsWrapper from './EventInfoDetailsWrapper.svelte';
  import ExitEventInfo from './ExitEventInfo.svelte';
  import ExitEventInfoDetailsWrapper from './ExitEventInfoDetailsWrapper.svelte';
  import FleetEventInfo from './FleetEventInfo.svelte';

  export let event: MyEvent;
  export let okLabel: string = 'OK';
  export let closeButton: boolean;

  $: fleetEvent =
    event.type === 'external_fleet_arrived' || event.type === 'internal_fleet_arrived' ? event : undefined;
  $: fleetSentEvent = event.type === 'external_fleet_sent' ? event : undefined;
  $: exitEvent = event.type === 'exit_complete' ? event : undefined;
</script>

{#if fleetEvent}
  <!-- <FleetEventInfo event={fleetEvent} {okLabel} {closeButton} on:close /> -->
  <EventInfoDetailsWrapper event={fleetEvent} {okLabel} {closeButton} on:close />
{:else if fleetSentEvent}
  <EventInfoDetailsWrapper event={fleetSentEvent} {okLabel} {closeButton} on:close />
{:else}
  <ExitEventInfoDetailsWrapper event={exitEvent} {okLabel} {closeButton} on:close />
  <!-- <ExitEventInfo event={exitEvent} {okLabel} {closeButton} on:close /> -->
{/if}
