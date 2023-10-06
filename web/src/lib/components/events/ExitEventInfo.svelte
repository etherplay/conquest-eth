<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import type {ExitCompleteEvent} from '$lib/space/myevents';
  import {account} from '$lib/account/account';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import PlayCoin from '../utils/PlayCoin.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import NavButton from '../navigation/NavButton.svelte';
  import {url} from '$lib/utils/url';

  export let event: ExitCompleteEvent;
  export let okLabel: string = 'OK';
  export let closeButton: boolean;

  let title = 'Exit Complete';
  if (event.interupted) {
    title = 'Exit Aborted';
  }

  async function acknowledge() {
    await account.acknowledgeEvent(event);
    event = null;
  }
</script>

<Modal {title} globalCloseButton={closeButton} cancelable={closeButton} on:close>
  {#if event.interupted}
    Your Exit has been aborted!
  {:else}
    You exited planet "{spaceInfo.getPlanetInfoViaId(event.event.planet.id).stats.name}" with {event.event.stake.div(
      '1000000000000000000'
    )}
    <PlayCoin class="h-6 w-6" />

    <NavButton label="withdrawals" href={url('withdrawals/')}>Withdraw</NavButton>
  {/if}

  <div class="text-center">
    <Button class="mt-4 text-center" label="Retry" on:click={acknowledge}>{okLabel}</Button>
  </div>
</Modal>
