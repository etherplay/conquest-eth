<script lang="ts">
  export let planetState;
  export let planetInfo;
  export let close: () => void;

  import sendFlow from '$lib/flows/send';
  import messageFlow from '$lib/flows/message';
  import showPlanetDepartures from '$lib/flows/showPlanetDepartures';
  import {wallet} from '$lib/blockchain/wallet';
  import Help from '$lib/components/utils/Help.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {planets} from '$lib/space/planets';
  import selection from '$lib/map/selection';
  import {initialContractsInfos} from '$lib/blockchain/contracts';

  function sendTo() {
    sendFlow.sendTo(planetChosenInfo.location);
    close();
  }

  function sendFrom() {
    sendFlow.sendFrom(planetChosenInfo.location);
    close();
  }

  function sendFleet() {
    if ($sendFlow.step === 'PICK_DESTINATION') {
      sendTo();
    } else {
      sendFrom();
    }
  }

  function messageOwner() {
    messageFlow.show($planetState.owner);
  }

  function showDepartures() {
    showPlanetDepartures.show(planetInfo.location.id);
  }

  $: planetChosenInfo = $selection ? spaceInfo.getPlanetInfo($selection.x, $selection.y) : undefined;

  $: planetChosenState = planetChosenInfo ? planets.planetStateFor(planetChosenInfo) : undefined;

  // $: console.log({planetChosenState, planetChosenInfo});

  $: walletIsOwner = $wallet.address && $wallet.address?.toLowerCase() === $planetState?.owner?.toLowerCase();

  $: walletIsChosenOwner =
    $wallet.address && $wallet.address?.toLowerCase() === $planetChosenState?.owner?.toLowerCase();

  $: YakuzaContract = (initialContractsInfos as any).contracts.Yakuza;

  $: planetIsYakuza =
    YakuzaContract && $planetChosenState?.owner?.toLowerCase() === YakuzaContract.address.toLowerCase();

  // $: destinationPlanetInfo =
  //   $sendFlow.data?.to && spaceInfo.getPlanetInfo($sendFlow.data?.to.x as number, $sendFlow.data?.to.y as number);
  // $: destinationPlanetState = $sendFlow.data?.to && planets.planetStateFor(destinationPlanetInfo);

  // $: originPlanetInfo =
  //   $sendFlow.data?.from && spaceInfo.getPlanetInfo($sendFlow.data?.from.x as number, $sendFlow.data?.from.y as number);

  // $: attacking =
  //   $sendFlow.step === 'PICK_ORIGIN' && destinationPlanetState && $destinationPlanetState?.owner !== $wallet.address;
</script>

{#if planetInfo.location.id === (planetChosenInfo ? planetChosenInfo.location.id : null)}
  <p class="m-3">Pick a Different Planet than Itself</p>
{:else if $sendFlow.yakuzaClaim}
  {#if !planetIsYakuza}
    <p class="m-3">Pick a Yakuza Planet to send from.</p>
  {:else}
    <PanelButton label="Confirm" class="m-2" color="text-blue-500" borderColor="border-blue-500" on:click={sendFleet}>
      <div class="w-20">
        Confirm
        <Help class="inline w-4 h-4">
          You can send out spaceships in the form of fleets to either attack or send reinforcement.
        </Help>
      </div>
    </PanelButton>
  {/if}
{:else if $sendFlow.step === 'PICK_ORIGIN' && !walletIsChosenOwner}
  <p class="m-3">Pick a Planet you own.</p>
{:else if $sendFlow.step === 'PICK_ORIGIN' && $planetChosenState.exiting}
  <p class="m-3">This Planet is exiting, pick another one</p>
{:else if $sendFlow.step === 'PICK_ORIGIN' && $planetChosenState.numSpaceships == 0}
  <p class="m-3">Pick a Planet with spaceships.</p>
{:else}
  <PanelButton label="Confirm" class="m-2" color="text-blue-500" borderColor="border-blue-500" on:click={sendFleet}>
    <div class="w-20">
      Confirm
      <Help class="inline w-4 h-4">
        You can send out spaceships in the form of fleets to either attack or send reinforcement.
      </Help>
    </div>
  </PanelButton>
{/if}

<!-- {#if !walletIsOwner}
  <PanelButton label="Message" color="text-blue-400" borderColor="border-blue-400" class="m-2" on:click={messageOwner}>
    <div class="w-20">Message Owner</div>
  </PanelButton>
{/if} -->
