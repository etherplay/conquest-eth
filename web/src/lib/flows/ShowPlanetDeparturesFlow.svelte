<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import showPlanetDepartures from '$lib/flows/showPlanetDepartures';
  import {now} from '$lib/time';
  import {formatError, timeToText} from '$lib/utils';
  import {logPeriod} from '$lib/config';
  import Blockie from '$lib/components/account/Blockie.svelte';
</script>

{#if $showPlanetDepartures.error}
  <Modal on:close={() => showPlanetDepartures.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned</h2>
      <p class="text-gray-300 mt-2 text-sm">{formatError($showPlanetDepartures.error)}</p>
      <PanelButton class="mt-5" label="Stake" on:click={() => showPlanetDepartures.acknownledgeError()}>Ok</PanelButton>
    </div>
  </Modal>
{:else if $showPlanetDepartures.step === 'LOADING'}
  <Modal on:close={() => showPlanetDepartures.cancel()} on:confirm={() => showPlanetDepartures.cancel()}>
    <p class="text-center">Please wait while we load the events...</p>
  </Modal>
{:else if $showPlanetDepartures.step === 'READY'}
  <Modal on:close={() => showPlanetDepartures.cancel()} on:confirm={() => showPlanetDepartures.cancel()}>
    {#if !$showPlanetDepartures.departures || $showPlanetDepartures.departures.length === 0}
      <p class="text-center">No fleets currently in transit from this planet.</p>
      <p class="text-center">(not counting yours)</p>
      <!-- since at least {timeToText(logPeriod)} -->
    {:else}
      {#each $showPlanetDepartures.departures as departure}
        <ul>
          <li>
            <Blockie class="w-6 h-6 inline my-1/2 mr-2" address={departure.owner} />
            sent
            {departure.amount}
            spaceships
            {timeToText(now() - departure.timestamp)}
            ago
          </li>
        </ul>
      {/each}
    {/if}
  </Modal>
{/if}
