<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import messageFlow from '$lib/flows/message';
  import {formatError} from '$lib/utils';
</script>

{#if $messageFlow.error}
  <Modal on:close={() => messageFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned</h2>
      <p class="text-gray-300 mt-2 text-sm">{formatError($messageFlow.error)}</p>
      <PanelButton class="mt-5" label="Stake" on:click={() => messageFlow.acknownledgeError()}>Ok</PanelButton>
    </div>
  </Modal>
{:else if $messageFlow.step === 'LOADING'}
  <Modal on:close={() => messageFlow.cancel()} on:confirm={() => messageFlow.cancel()}>
    <p class="text-center">Please wait while we load the profile...</p>
  </Modal>
{:else if $messageFlow.step === 'READY'}
  <Modal on:close={() => messageFlow.cancel()} on:confirm={() => messageFlow.cancel()}>
    {#if !$messageFlow.profile || !$messageFlow.profile.description}
      <p class="text-center">The user did not provide any information.</p>
      <p class="text-center">
        Find each other on
        <a href="https://discord.gg/Qb4gr2ekfr" target="_blank" rel="noopener" class="underline">discord</a>
      </p>
    {:else if $messageFlow.profile.description}
      <p class="text-center">{$messageFlow.owner}</p>
      <p class="m-4 text-center">Here is how to contact the player:</p>
      <p class="text-center">{$messageFlow.profile.description}</p>
    {/if}
  </Modal>
{/if}
