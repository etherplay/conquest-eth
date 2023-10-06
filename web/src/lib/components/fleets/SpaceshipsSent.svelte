<script lang="ts">
  import sendFlow from '$lib/flows/send';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import AddToCalendar from '$lib/components/addtocalendar/AddToCalendar.svelte';
  import {timeToText} from '$lib/utils';
  import {now} from '$lib/time';
  import {base} from '$app/paths';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {url} from '$lib/utils/url';

  $: fromPlanetInfo = spaceInfo.getPlanetInfo($sendFlow.data?.from.x, $sendFlow.data?.from.y);
  // $: fromPlanetState = planets.planetStateFor(fromPlanetInfo);

  $: toPlanetInfo = spaceInfo.getPlanetInfo($sendFlow.data?.to.x, $sendFlow.data?.to.y);
  // $: toPlanetState = planets.planetStateFor(toPlanetInfo);

  $: minDuration = spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo);
  $: duration = $sendFlow.data?.config?.arrivalTimeWanted
    ? Math.max(minDuration, $sendFlow.data?.config?.arrivalTimeWanted - now())
    : minDuration;
  $: arrival = duration + now();
</script>

<Modal>
  <div class="text-center">
    <p class="mb-4">Congratulations! Your fleets is on its way (transaction pending...)</p>
    <p class="mb-4">
      Once the transaction is mined, the fleet will take
      {timeToText(duration, {verbose: true})}
      to reach the destination. Assuming it get mined instantly, it should arrive on
      {new Date(arrival * 1000).toString()}.
    </p>

    {#if $sendFlow.data?.useAgentService}
      <p class="mb-4">
        You submitted your fleet to the <a class="underline font-black" href={url('agent-service/')}>Agent Service</a>.
        If all is good, you do not need to do anything else.
      </p>
      <p class="mb-4">But there is always a risk something goes wrong. You might want to setup a reminder:</p>

      <AddToCalendar
        title="conquest.eth: Come Back To Resolve Fleet in Time!"
        description="Come back to conquest.eth and resolve your fleet."
        timestamp={arrival}
        url={window.location.toString()}
        location={window.location.toString()}
        duration={105}
      />
      <!-- 1h45min event duration -->
    {:else}
      <p class="mb-4 text-yellow-500">
        Remember you need to ensure to execute the "resolution" transaction at that time. See
        <a class="underline" href={`${base}/help/`} target="_blank">Help</a>
        for more details.
      </p>
      <p class="mb-4">
        Alternatively, you can always setup an agent
        <a class="underline" href={`${base}/agent-service/`} target="_blank">here</a>. As long as it is topped up, it
        can resolve the fleets for you.
      </p>

      <p class="mb-4">You can also create a reminder here</p>

      <AddToCalendar
        title="conquest.eth: Come Back To Resolve Fleet in Time!"
        description="Come back to conquest.eth and resolve your fleet."
        timestamp={arrival}
        url={window.location.toString()}
        location={window.location.toString()}
        duration={105}
      />
      <!-- 1h45min event duration -->
    {/if}

    <PanelButton label="OK" class="mt-4" on:click={() => sendFlow.acknownledgeSuccess()}>OK</PanelButton>
  </div>
</Modal>
