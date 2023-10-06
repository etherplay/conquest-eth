<script lang="ts">
  import SendingSpaceships from '$lib/components/fleets/SendingSpaceships.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import sendFlow from '$lib/flows/send';
  import Modal from '$lib/components/generic/Modal.svelte';
  import SpaceshipsSent from '$lib/components/fleets/SpaceshipsSent.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import SendPreTransactionMessage from '$lib/components/fleets/SendPreTransactionMessage.svelte';
  import {url} from '$lib/utils/url';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import VirtualFleetInfoPanel from '$lib/components/planets/VirtualFleetInfoPanel.svelte';
  import {formatError} from '$lib/utils';

  $: pickNeeded =
    $sendFlow.step === 'PICK_DESTINATION' ? 'destination' : $sendFlow.step === 'PICK_ORIGIN' ? 'origin' : undefined;

  let transactionHashToRecover: string;
</script>

{#if $sendFlow.error}
  <Modal on:close={() => sendFlow.acknownledgeError()}>
    {#if $sendFlow.error.type === 'AGENT_SERVICE_SUBMISSION_ERROR'}
      <div class="text-center">
        <h2 class="text-red-500 text-xl">Failed to submit to agent-service</h2>
        <p class="mt-2 text-sm">{formatError($sendFlow.error)}</p>
        <p class="mt-2">
          You can always retry on the <a class="underline" href={url('agent-service/')}>agent-service page</a>
        </p>
        <Button class="mt-5" label="Stake" on:click={() => sendFlow.acknownledgeError()}>Ok</Button>
      </div>
    {:else}
      <div class="text-center">
        <h2 class="text-xl">An error happenned</h2>
        <p class="mt-2 text-red-500 text-xl">{formatError($sendFlow.error)}</p>
        <Button class="mt-5" label="Stake" on:click={() => sendFlow.acknownledgeError()}>Ok</Button>
      </div>
    {/if}
  </Modal>
{:else if $sendFlow.cancelingConfirmation}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    on:close={() => sendFlow.cancelCancelation()}
    on:confirm={() => sendFlow.cancel()}
  >
    <div class="text-center">
      <p class="pb-4">Are you sure to cancel ?</p>
      <p class="pb-4">(This will prevent the game to record your transaction, if you were to execute it afterward)</p>

      <div class="border-amber-400 border-2 m-4">
        <p class="m-2 text-orange-400">
          Maybe your wallet encountered an error and the tx got confirmed ? (it happens on Metamask, see <a
            class="underline"
            href="https://github.com/MetaMask/metamask-extension/issues/13928">here</a
          >
          or <a class="underline" href="https://github.com/MetaMask/metamask-extension/issues/13929">here</a> and upvote)
        </p>
        <p class="m-2">If so please enter the transaction hash so we can recover the fleet.</p>
        <p class="m-2">
          Transacion Hash: <input type="text" bind:value={transactionHashToRecover} class="bg-black text-white" />
        </p>

        <PanelButton
          color="text-orange-400"
          class="m-2"
          label="recover"
          on:click={() => sendFlow.recoverFleetFromTxHash(transactionHashToRecover)}>Recover</PanelButton
        >
      </div>
      <PanelButton label="nevermind" on:click={() => sendFlow.cancel()}>Skip</PanelButton>
    </div>
  </Modal>
{:else if pickNeeded}
  {#if $sendFlow.step === 'PICK_DESTINATION'}
    <VirtualFleetInfoPanel coords={$sendFlow.data?.from} {pickNeeded} />
  {:else if $sendFlow.step === 'PICK_ORIGIN'}
    <VirtualFleetInfoPanel coords={$sendFlow.data?.to} {pickNeeded} />
  {/if}
{:else if $sendFlow.step === 'INACTIVE_PLANET'}
  <Modal>
    <p class="mb-3">
      You are sending spaceships to an inactive planets. Note that once your fleet capture the planet, its population
      will decrease until you stake <PlayCoin class="w-4 h-4 inline" /> on it.
    </p>

    <p>
      While no other players can stake on it while you still have spaceships there, once the number of spaceships
      reaches zero, anyone can stake on it.
    </p>

    <div class="text-center">
      <PanelButton
        label="Cancel"
        color="text-red-500"
        borderColor="border-red-500"
        class="mt-4"
        on:click={() => sendFlow.cancel()}>Cancel</PanelButton
      >
      <PanelButton label="Continue" class="mt-4" on:click={() => sendFlow.sendTo($sendFlow.data.to)}
        >Continue</PanelButton
      >
    </div>
  </Modal>
{:else if $sendFlow.step === 'CHOOSE_FLEET_AMOUNT'}
  <!-- <SpaceshipsSent /> -->
  <SendingSpaceships />
{:else if $sendFlow.step === 'SUCCESS'}
  <SpaceshipsSent />
{:else if $sendFlow.step === 'TUTORIAL_PRE_TRANSACTION'}
  <SendPreTransactionMessage />
{:else if $sendFlow.step === 'TUTORIAL_PRE_FLEET_AMOUNT'}
  <Modal>
    <p class="mb-3">
      You are getting ready to send your first fleet. In the upcoming screen, You'll be able to choose how much
      spaceships you want to send and see the expected outcome once the spaceships reaches the destination.
    </p>
    <p class="mb-3">
      Note though that once confirmed, this is only the first part of the action you need to perform in order for the
      fleet to perform its duties. You'll need to make sure the fleet action is resolved once it reaches the
      destination. This 2-step process is to ensure your action remains secret to all other players.
    </p>
    <p class="mb-3">
      To help you, we will offer you to create an event on your calendar. But we also provide a mechanism to
      automatically perform that second action on your behalf assuming you trust us and our infrastructure, See <a
        class="underline font-black"
        href={url('agent-service/')}>Agent Service</a
      >
    </p>
    <div class="text-center">
      <PanelButton label="OK" class="mt-4" on:click={() => sendFlow.acknowledgeWelcomingStep1()}>OK</PanelButton>
    </div>
  </Modal>
{:else if $sendFlow.step === 'CONNECTING'}
  <Modal on:close={() => sendFlow.cancel()}>Connecting...</Modal>
{:else if $sendFlow.step === 'CREATING_TX'}
  <Modal>Preparing The Transaction...</Modal>
{:else if $sendFlow.step === 'WAITING_TX'}
  <Modal closeButton={true} globalCloseButton={true} closeOnOutsideClick={false} on:close={() => sendFlow.cancel(true)}
    >Please Accept the Transaction...
  </Modal>
{:else}
  <Modal>...</Modal>
{/if}
