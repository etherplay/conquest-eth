<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import type {ExternalFleetEvent, InternalFleetEvent, MyEvent} from '$lib/space/myevents';
  import {account} from '$lib/account/account';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {wallet} from '$lib/blockchain/wallet';
  import Blockie from '../account/Blockie.svelte';
  import Coord from '../utils/Coord.svelte';

  export let event: InternalFleetEvent | ExternalFleetEvent;
  export let okLabel: string = 'OK';
  export let closeButton: boolean;

  let title;

  let fromYou = false;
  let toYou = false;
  let gift = false;
  let attackCaptured = false;

  $: if (event && event.event) {
    gift = event.event.gift;
    attackCaptured = event.event.won;
    if (event.event.owner.id === $wallet.address.toLowerCase()) {
      fromYou = true;
      if (event.event.gift) {
        if (event.event.destinationOwner.id === event.event.owner.id) {
          toYou = true;
          title = 'Your spaceships landed!';
        } else {
          title = 'Your spaceships arrived!';
        }
      } else if (event.event.won) {
        title = 'You captured a planet!';
      } else {
        title = 'Your attack failed to capture!';
      }
    } else {
      toYou = true;
      if (event.event.gift) {
        title = 'You received some spaceships';
      } else if (event.event.won) {
        title = 'You lost your planet!';
      } else {
        title = 'You got attacked but managed to keep your planet!';
      }
    }
  } else {
    title = 'Void event'; // TODO can it happen ?
  }

  async function acknowledge() {
    await account.acknowledgeEvent(event);
    // event = null;
  }
</script>

{#if event}
  <Modal {title} globalCloseButton={closeButton} cancelable={closeButton} on:close>
    {#if toYou && fromYou}
      <p>
        Your {event.event.quantity - event.event.inFlightFleetLoss} spacesships arrived! from planet <Coord
          location={event.event.from.id}
        />
      </p>
      {#if event.event.inFlightFleetLoss > 0}
        <p>({event.event.inFlightFleetLoss} spacesships were destroyed at launch)</p>
      {/if}
    {:else if fromYou}
      {#if gift}
        <p>
          Your {event.event.quantity - event.event.inFlightFleetLoss} spacesships arrived! from planet <Coord
            location={event.event.from.id}
          /> to <Blockie class="w-6 h-6 inline-block" address={event.event.destinationOwner.id} />
        </p>
        {#if event.event.inFlightFleetLoss > 0}
          <p>({event.event.inFlightFleetLoss} spacesships were destroyed at launch)</p>
        {/if}
      {:else if attackCaptured}
        <p>
          You captured the planet {#if event.event.destinationOwner.id !== '0x0000000000000000000000000000000000000000'}from
            <Blockie class="w-6 h-6 inline-block" address={event.event.destinationOwner.id} />
          {/if} with your fleet of {event.event.quantity - event.event.inFlightFleetLoss} spacesships sent from planet <Coord
            location={event.event.from.id}
          />
        </p>
        {#if event.event.accumulatedAttackAdded > 0}
          <p>
            The attack was combined with the previous fleet making a total of {event.event.quantity -
              event.event.inFlightFleetLoss +
              event.event.accumulatedAttackAdded} spaceships attacking {event.event.planetLoss +
              event.event.inFlightPlanetLoss}
          </p>
        {/if}

        {#if event.event.inFlightFleetLoss > 0}
          <p>({event.event.inFlightFleetLoss} spacesships were destroyed at launch)</p>
        {/if}
      {:else}
        <p>
          Your attack did not succeed but you killed {event.event.planetLoss + event.event.inFlightPlanetLoss} spaceships
          {#if event.event.destinationOwner.id !== '0x0000000000000000000000000000000000000000'}from
            <Blockie class="w-6 h-6 inline-block" address={event.event.destinationOwner.id} />
          {/if} with your fleet of {event.event.quantity - event.event.inFlightFleetLoss} spacesships sent from planet <Coord
            location={event.event.from.id}
          />. {#if event.event.inFlightPlanetLoss > 0}
            There was {event.event.inFlightPlanetLoss} spaceships destroyed in orbit defense
          {/if}
        </p>

        {#if event.event.accumulatedAttackAdded > 0}
          <p>
            The attack was combined with the previous fleet making a total of {event.event.quantity -
              event.event.inFlightFleetLoss +
              event.event.accumulatedAttackAdded} spaceships attacking
            <!-- TODO get info about total defenses-->
          </p>
        {/if}

        {#if event.event.inFlightFleetLoss > 0}
          <p>({event.event.inFlightFleetLoss} spacesships were destroyed at launch)</p>
        {/if}
      {/if}
    {:else if gift}
      <p>
        You received {event.event.quantity - event.event.inFlightFleetLoss} spacesships by <Blockie
          class="w-6 h-6 inline-block"
          address={event.event.owner.id}
        /> from planet <Coord location={event.event.from.id} />.
      </p>
    {:else if attackCaptured}
      <p>
        You lost your planet from <Blockie class="w-6 h-6 inline-block" address={event.event.owner.id} />
      </p>
      <p>
        The fleet had {event.event.quantity - event.event.inFlightFleetLoss} spaceships and planet defended with {event
          .event.planetLoss + event.event.inFlightPlanetLoss}. {#if event.event.inFlightPlanetLoss > 0}
          Including {event.event.inFlightPlanetLoss} spacesships in orbit. (this will be deduced to your traveling fleets)
        {/if}
      </p>

      {#if event.event.accumulatedAttackAdded > 0}
        <p>
          The attack was combined with the previous fleet making a total of {event.event.quantity -
            event.event.inFlightFleetLoss +
            event.event.accumulatedAttackAdded} spaceships attacking
          <!-- TODO get info about total defenses-->
        </p>
      {/if}
    {:else}
      <p>
        Your planet defended succesfully from <Blockie class="w-6 h-6 inline-block" address={event.event.owner.id} /> but
        lost {event.event.planetLoss} spaceships.
      </p>
      <p>
        The fleet had {event.event.quantity - event.event.inFlightFleetLoss} spaceships and planet defended with {event
          .event.planetLoss + event.event.inFlightPlanetLoss}.{#if event.event.inFlightPlanetLoss > 0}
          Including {event.event.inFlightPlanetLoss} spacesships in orbit. (this will be deduced to your traveling fleets)
        {/if}
      </p>

      {#if event.event.accumulatedAttackAdded > 0}
        <p>
          The attack was combined with the previous fleet making a total of {event.event.quantity -
            event.event.inFlightFleetLoss +
            event.event.accumulatedAttackAdded} spaceships attacking {event.event.planetLoss +
            event.event.inFlightPlanetLoss}
        </p>
      {/if}
    {/if}
    {#if !event.event}
      Void Event <!-- TODO is that possible ?-->
    {/if}

    <div class="text-center">
      <Button class="mt-4 text-center" label="Retry" on:click={acknowledge}>{okLabel}</Button>
    </div>
  </Modal>
{/if}
