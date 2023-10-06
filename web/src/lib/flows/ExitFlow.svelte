<script lang="ts">
  import {formatError, timeToText} from '$lib//utils';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import exitFlow from '$lib/flows/exit';
  import {spaceInfo} from '$lib/space/spaceInfo';

  $: planetInfo = spaceInfo.getPlanetInfo($exitFlow.data?.location.x, $exitFlow.data?.location.y);
</script>

{#if $exitFlow.error}
  <Modal on:close={() => exitFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned</h2>
      <p class="text-red-300 mt-2 text-sm">{formatError($exitFlow.error)}</p>
      <Button class="mt-5" label="Stake" on:click={() => exitFlow.acknownledgeError()}>Ok</Button>
    </div>
  </Modal>
{:else if $exitFlow.cancelingConfirmation}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    on:close={() => exitFlow.cancelCancelation()}
    on:confirm={() => exitFlow.cancel()}
  >
    <div class="text-center">
      <p class="pb-4">Are you sure to cancel ?</p>
      <p class="pb-4">(This will prevent the game to record your transaction, if you were to execute it afterward)</p>
      <PanelButton label="OK" on:click={() => exitFlow.cancel()}>Yes</PanelButton>
    </div>
  </Modal>
{:else if $exitFlow.step === 'WAITING_CONFIRMATION'}
  <Modal on:close={() => exitFlow.cancel()} on:confirm={() => exitFlow.confirm()}>
    <p class="text-center">
      Exiting a planet will allow you to claim the stake back ({planetInfo.stats.stake / 10000}
      <PlayCoin class="inline w-4" />
      for this planet). But be careful, while you are exiting (this takes
      {timeToText(spaceInfo.exitDuration, {verbose: true})}), you cannot operate with the spaceships and someone else
      might be able to capture the planet before exit complete. Note however that the planet will continue producting
      spaceships for its defense. Upon exit, the number of spaceships will then be zero.
    </p>
    <p class="text-center">
      <PanelButton class="mt-5" label="Exit" on:click={() => exitFlow.confirm()}>Confirm Exit</PanelButton>
    </p>
  </Modal>
{:else if $exitFlow.step === 'CREATING_TX'}
  <Modal>Preparing the Transaction...</Modal>
{:else if $exitFlow.step === 'WAITING_TX'}
  <Modal closeButton={true} globalCloseButton={true} closeOnOutsideClick={false} on:close={() => exitFlow.cancel(true)}>
    Please Accept the Transaction...
  </Modal>
{:else}
  <Modal>
    {#if $exitFlow.step === 'SUCCESS'}
      <div class="text-center">
        <p class="pb-4">
          You'll be able to claim back the stake
          {timeToText(spaceInfo.exitDuration, {verbose: true})}
          after the tx is mined
        </p>
        <PanelButton label="OK" on:click={() => exitFlow.acknownledgeSuccess()}>OK</PanelButton>
      </div>
    {:else if $exitFlow.step === 'CONNECTING'}
      Connecting...
    {:else}...{/if}
  </Modal>
{/if}
