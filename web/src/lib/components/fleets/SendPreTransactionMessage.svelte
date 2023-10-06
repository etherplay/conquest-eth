<script lang="ts">
  import sendFlow from '$lib/flows/send';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {timeToText} from '$lib/utils';
  import {now} from '$lib/time';

  $: fromPlanetInfo = spaceInfo.getPlanetInfo($sendFlow.data.from.x, $sendFlow.data.from.y);
  // $: fromPlanetState = planets.planetStateFor(fromPlanetInfo);

  $: toPlanetInfo = spaceInfo.getPlanetInfo($sendFlow.data.to.x, $sendFlow.data.to.y);
  // $: toPlanetState = planets.planetStateFor(toPlanetInfo);

  $: minDuration = spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo);
  $: duration = $sendFlow.data?.config?.arrivalTimeWanted
    ? Math.max(minDuration, $sendFlow.data?.config?.arrivalTimeWanted - now())
    : minDuration;
  $: arrival = duration + now();
</script>

<Modal>
  {#if $sendFlow.data?.useAgentService}
    <p class="mb-3">
      You are about to confirm the launch of your fleet. While you set it up to use the agent-service, note that there
      is no 100% guarantee it will resolve in time. The service will do its best to ensure the fleet is resolved around
      {new Date(arrival * 1000).toString()}). If it does not, you'll have a
      {timeToText(spaceInfo.resolveWindow, {verbose: true})}
      time window to execute it.
    </p>
  {:else}
    <p class="mb-3">
      You are about to confirm the launch of your fleet. Remember that you'll need to ensure an extra transaction is
      performed once the fleet reaches destination (around
      {new Date(arrival * 1000).toString()}). You'll have a
      {timeToText(spaceInfo.resolveWindow, {verbose: true})}
      time window to execute it.
    </p>
    <p>Once the first transaction is submitted, we will help you create a reminder.</p>
    <p class="my-2">
      You can also setup the agent-service so that it will resolve your fleets automatically. See
      <a href={`agent-service/`} class="underline font-black">Agent Service</a>
    </p>
  {/if}
  <div class="text-center">
    <PanelButton label="OK" class="mt-4" on:click={() => sendFlow.acknowledgeWelcomingStep2()}>OK</PanelButton>
  </div>
</Modal>
