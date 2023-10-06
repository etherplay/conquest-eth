<script lang="ts">
  import {account} from '$lib/account/account';
  import {agentService} from '$lib/account/agentService';

  import Button from '$lib/components/generic/PanelButton.svelte';

  import type {Fleet} from '$lib/space/fleets';

  import {spaceInfo} from '$lib/space/spaceInfo';
  import {now, time} from '$lib/time';
  import {timeToText} from '$lib/utils';
  import Coord from '../utils/Coord.svelte';
  export let fleet: Fleet;
  export let actionAvailable: boolean;

  let from = fleet.from;
  let to = fleet.to;
  // let distance = spaceInfo.distance(from, to);
  $: timeLeft = spaceInfo.timeLeft($time, from, to, fleet.launchTime).timeLeft;

  async function submit() {
    const distance = spaceInfo.distance(from, to);
    const minDuration = spaceInfo.timeToArrive(from, to);
    const {toHash, fleetId, secretHash} = await account.hashFleet(
      from.location,
      to.location,
      fleet.gift,
      fleet.specific,
      fleet.arrivalTimeWanted,
      fleet.sending.action.nonce, // this might not be tx nonce // TODO use a different fieldName : secretNonce
      //  and then we can have action.nonce optional
      fleet.owner,
      fleet.fleetSender,
      fleet.operator
    );
    const {queueID} = await agentService.submitReveal(
      fleetId,
      secretHash,
      from.location,
      to.location,
      distance,
      fleet.arrivalTimeWanted,
      fleet.gift,
      fleet.specific,
      fleet.potentialAlliances,
      fleet.launchTime,
      minDuration,
      fleet.fleetSender,
      fleet.operator
    );
    account.recordQueueID(fleet.sending.id, queueID);
  }

  function forget() {
    // account.markAsFullyAcknwledged(fleet.sending.id, now()); ?/ TODO thrid param succes ?
  }
</script>

<p>
  fleets of {fleet.quantity} spaceships sent from {from.stats.name}
  <Coord location={from.location.id} /> to reach {to.stats.name}
  <Coord location={to.location.id} />
  {#if timeLeft >= 0}
    in {timeToText(timeLeft)}
  {:else}
    ({timeToText(spaceInfo.resolveWindow + timeLeft)} left to resolve)
  {/if}
  {#if fleet.resolution}
    (tx to resolve on its way...)
  {/if}
  ({fleet.state})
  {#if actionAvailable && (fleet.state === 'TRAVELING' || fleet.state === 'SEND_BROADCASTED') && !fleet.sending.action.queueID}
    <Button label="submit" on:click={submit}>submit</Button>
  {:else if fleet.state === 'SEND_BROADCASTED' && $time - fleet.sending.action.timestamp > 30}
    <!-- <Button label="forget" on:click={forget}>forget</Button> -->
  {/if}
</p>
