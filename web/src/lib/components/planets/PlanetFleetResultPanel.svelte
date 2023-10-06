<!-- TODO delete ?-->
<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  // import privateAccount from '$lib/account/privateAccount';
  // import type {OwnFleet} from 'conquest-eth-common';
  // export let fleet: {
  //   id: string;
  //   status: 'Error' | 'Success' | 'Expired';
  // } & OwnFleet;

  // import {fetchFleetEvent} from '$lib/space/spaceInfo';

  function acknowledge(force = false) {
    if (!force && fleet.resolveTx && fleet.status === 'Error') {
      // privateAccount.acknowledgeResolveFailure(fleet.id);
    } else {
      // privateAccount.requestFleetDeletion(fleet.id);
    }
  }
</script>

<!--
{#if fleet.status === 'Error'}
  <p class="p-2">The Fleet Transaction Failed</p>
  TODO discern between resolution and sending
  <p class="p-2">
    See
    <a
      target="_blank"
      class="underline text-cyan-100"
      href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${
        fleet.resolveTx ? fleet.resolveTx.hash : fleet.sendTx.hash
      }`}>here</a
    >
  </p>
  <PanelButton label="Connect your wallet" class="m-2" on:click={() => acknowledge()}>
    <div class="w-20">OK</div>
  </PanelButton>
{:else if fleet.status === 'Expired'}
  <p class="p-2">
    The Fleet was not resolved in time. The
    {fleet.fleetAmount}
    spaceships are now now lost in space.
    <PanelButton label="Connect your wallet" class="m-2" on:click={() => acknowledge(true)}>
      <div class="w-20">OK</div>
    </PanelButton>
  </p>
{:else}
  {#await fetchFleetEvent(fleet.id)}
    <p class="p-2">Loading Event...</p>
  {:then event}
    {#if event.attack}
      {#if event.won}
        {#if event.newNumspaceships > 0}
          <p class="p-2">Fleet captured the planet and survived with {event.newNumspaceships} spaceships</p>
        {:else}
          <p class="p-2">Fleet just captured the planet!</p>
        {/if}
      {:else}
        <p class="p-2">Fleet attack failed but reduced planet defense by {event.planetLoss} spaceships</p>
      {/if}
      {#if event.inFlightFleetLoss > 0}
        <p class="p-2">
          Note Fleet was partially dammaged ({event.inFlightFleetLoss}
          spaceships lost) when launched. This reduced its attak power.
        </p>
      {/if}
      {#if event.inFlightPlanetLoss > 0}
        <p class="p-2">The Fleet damaged escaping fleets by {event.inFlightPlanetLoss} spaceships.</p>
      {/if}
    {:else}
      <p class="p-2">Fleet arrived with {fleet.fleetAmount - event.inFlightFleetLoss} spaceships</p>
      {#if event.inFlightFleetLoss > 0}
        <p class="p-2">
          Note Fleet was partially dammaged ({event.inFlightFleetLoss}
          spaceships lost) when launched. This reduced the number of spaceship sent.
        </p>
      {/if}
    {/if}
    <p class="p-2">
      <a
        target="_blank"
        class="underline text-cyan-100"
        href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${event.transactionHash}`}>transaction details</a
      >
    </p>
  {:catch error}
    <p class="p-2">{error}</p>
  {/await}
  <PanelButton label="Connect your wallet" class="m-2" on:click={() => acknowledge()}>
    <div class="w-20">OK</div>
  </PanelButton>
{/if} -->
