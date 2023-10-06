<script lang="ts">
  import {formatError, timeToText} from '$lib//utils';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import planetTransferFlow from '$lib/flows/planetTransfer';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import Help from '$lib/components/utils/Help.svelte';

  $: planetInfo = spaceInfo.getPlanetInfo($planetTransferFlow.data?.location.x, $planetTransferFlow.data?.location.y);

  let newOwner: string | undefined;
</script>

{#if $planetTransferFlow.error}
  <Modal on:close={() => planetTransferFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned</h2>
      <p class="text-red-500 mt-2 text-sm">{formatError($planetTransferFlow.error)}</p>
      <Button class="mt-5" label="Stake" on:click={() => planetTransferFlow.acknownledgeError()}>Ok</Button>
    </div>
  </Modal>
{:else if $planetTransferFlow.cancelingConfirmation}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    on:close={() => planetTransferFlow.cancelCancelation()}
    on:confirm={() => planetTransferFlow.cancel()}
  >
    <div class="text-center">
      <p class="pb-4">Are you sure to cancel ?</p>
      <p class="pb-4">(This will prevent the game to record your transaction, if you were to execute it afterward)</p>
      <PanelButton label="OK" on:click={() => planetTransferFlow.cancel()}>Yes</PanelButton>
    </div>
  </Modal>
{:else if $planetTransferFlow.step === 'CHOOSE_NEW_OWNER'}
  <Modal on:close={() => planetTransferFlow.cancel()}>
    <p class="text-center">Who do you want to transfer to ?</p>
    <p>
      <input class="text-cyan-300 bg-black" type="text" id="newOwner" name="newOwner" bind:value={newOwner} />
      <Help class="w-6 h-6"
        >The planet will be transfered and if you are not in an alliance with the new owner for at least 3 days, then a
        tax will be applied to the number of spaceship currently on the planet</Help
      >
    </p>
    <p class="text-center">
      <PanelButton class="mt-5" label="Transfer" on:click={() => planetTransferFlow.confirm(newOwner)}
        >Confirm</PanelButton
      >
    </p>
  </Modal>
{:else if $planetTransferFlow.step === 'CREATING_TX'}
  <Modal>Preparing the Transaction...</Modal>
{:else if $planetTransferFlow.step === 'WAITING_TX'}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    closeOnOutsideClick={false}
    on:close={() => planetTransferFlow.cancel(true)}
  >
    Please Accept the Transaction...
  </Modal>
{:else}
  <Modal>
    {#if $planetTransferFlow.step === 'SUCCESS'}
      <div class="text-center">
        <p class="pb-4">Transfer on its way...</p>
        <PanelButton label="OK" on:click={() => planetTransferFlow.acknownledgeSuccess()}>OK</PanelButton>
      </div>
    {:else if $planetTransferFlow.step === 'CONNECTING'}
      Connecting...
    {:else}...{/if}
  </Modal>
{/if}
