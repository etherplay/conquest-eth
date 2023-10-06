<script lang="ts">
  import {account} from '$lib/account/account';

  import Modal from '$lib/components/generic/Modal.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import type {ExitCompleteEvent} from '$lib/space/myevents';
  import EventDetails from './EventDetails.svelte';

  export let event: ExitCompleteEvent;
  export let okLabel: string = 'OK';
  export let closeButton: boolean;

  async function acknowledge() {
    await account.acknowledgeEvent(event);
  }
</script>

{#if event}
  <Modal maxWidth="max-w-screen-xl" globalCloseButton={closeButton} cancelable={closeButton} on:close>
    <EventDetails event={event.event} />
    <div class="text-center">
      <Button class="mt-4 text-center" label="Retry" on:click={acknowledge}>{okLabel}</Button>
    </div>
  </Modal>
{/if}
