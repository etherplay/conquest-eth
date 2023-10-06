<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import Banner from '$lib/components/screen/Banner.svelte';
  import simulateFlow from '$lib/flows/simulateFlow';
  import Modal from '$lib/components/generic/Modal.svelte';
  import SimulateSpaceships from '$lib/components/fleets/SimulateSpaceships.svelte';
  import {formatError} from '$lib/utils';
</script>

{#if $simulateFlow.error}
  <Modal on:close={() => simulateFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned</h2>
      <p class="text-gray-300 mt-2 text-sm">{formatError($simulateFlow.error)}</p>
      <Button class="mt-5" label="Stake" on:click={() => simulateFlow.acknownledgeError()}>Ok</Button>
    </div>
  </Modal>
{:else if $simulateFlow.step === 'PICK_DESTINATION'}
  <Banner on:close={() => simulateFlow.cancel()}>
    <p class="font-medium"><span class="inline" /> Pick the Destination</p>
  </Banner>
{:else if $simulateFlow.step === 'SIMULATE'}
  <SimulateSpaceships />
{:else}
  <Modal>...</Modal>
{/if}
