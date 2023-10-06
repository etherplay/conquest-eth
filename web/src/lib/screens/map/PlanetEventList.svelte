<script lang="ts">
  import EventInfo from '$lib/components/events/EventInfo.svelte';
  import {myevents} from '$lib/space/myevents';
  import {errors} from '$lib/space/errors';
  import {xyToLocation} from 'conquest-eth-common';
  import selection from '$lib/map/selection';
  import ErrorDetails from '$lib/components/events/ErrorDetails.svelte';

  export let location: string;

  $: planetEvents = $myevents.filter((event) => event.location === location);
  $: planetErrors = $errors.filter((error) => xyToLocation(error.location.x, error.location.y) === location);

  function deselect() {
    selection.unselect();
  }
</script>

{#if planetErrors.length > 0}
  <ErrorDetails
    error={planetErrors[0]}
    okLabel={planetErrors.length > 1 || planetEvents.length > 0 ? 'Next' : 'OK'}
    closeButton={true}
    on:close={deselect}
  />
{:else if planetEvents.length > 0}
  <EventInfo
    event={planetEvents[0]}
    okLabel={planetEvents.length > 1 ? 'Next' : 'OK'}
    closeButton={true}
    on:close={deselect}
  />
{/if}
