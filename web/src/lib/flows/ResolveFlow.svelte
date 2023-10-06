<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import resolveFlow from '$lib/flows/resolve';
  import {formatError} from '$lib/utils';
  import PendingResolutions from './PendingResolutions.svelte';
</script>

{#if $resolveFlow.error}
  <Modal on:close={() => resolveFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned</h2>
      <p class="text-red-500 mt-2 text-sm">{formatError($resolveFlow.error)}</p>
      <Button class="mt-5" label="Stake" on:click={() => resolveFlow.acknownledgeError()}>Ok</Button>
    </div>
  </Modal>
{:else if $resolveFlow.cancelingConfirmation}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    on:close={() => resolveFlow.cancelCancelation()}
    on:confirm={() => resolveFlow.cancel()}
  >
    <div class="text-center">
      <p class="pb-4">Are you sure to cancel ?</p>
      <p class="pb-4">(This will prevent the game to record your transaction, if you were to execute it afterward)</p>
      <PanelButton label="OK" on:click={() => resolveFlow.cancel()}>Yes</PanelButton>
    </div>
  </Modal>
{:else if $resolveFlow.step === 'SUCCESS'}
  <Modal>
    <div class="text-center">
      <p class="mb-4">The fleet will resolve if mined in time</p>
      <PanelButton label="OK" on:click={() => resolveFlow.acknownledgeSuccess()}>OK</PanelButton>
    </div>
  </Modal>
{:else if $resolveFlow.step === 'CONNECTING'}
  <Modal>Connecting...</Modal>
{:else if $resolveFlow.step === 'CREATING_TX'}
  <Modal>Preparing the Transaction...</Modal>
{:else if $resolveFlow.step === 'SHOW_LIST'}
  <PendingResolutions />
{:else if $resolveFlow.step === 'WAITING_TX'}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    closeOnOutsideClick={false}
    on:close={() => resolveFlow.cancel(true)}>Please Accept the Transaction...</Modal
  >
{:else}<Modal>...</Modal>{/if}
