<script lang="ts">
  import Map from './Map.svelte';
  import ConnectPanel from '$lib/components/account/ConnectPanel.svelte';
  import {account} from '$lib/account/account';
  import {TutorialSteps} from '$lib/account/constants';
  import Banner from '$lib/components/screen/Banner.svelte';
  import {bitMaskMatch, timeToText} from '$lib/utils';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import selection from '$lib/map/selection';
  import PlanetInfoPanel from '$lib/components/planets/PlanetInfoPanel.svelte';
  import PlanetsListPanel from '$lib/components/planets/PlanetsListPanel.svelte';
  import FleetsList from '$lib/components/fleets/FleetsList.svelte';
  import EventsList from '$lib/components/events/EventsList.svelte';

  import claimFlow from '$lib/flows/claim';
  import ClaimFlow from '$lib/flows/ClaimFlow.svelte';
  import sendFlow from '$lib/flows/send';
  import SendFlow from '$lib/flows/SendFlow.svelte';
  import simulateFlow from '$lib/flows/simulateFlow';
  import SimulateFlow from '$lib/flows/SimulateFlow.svelte';
  import exitFlow from '$lib/flows/exit';
  import ExitFlow from '$lib/flows/ExitFlow.svelte';
  import planetTransferFlow from '$lib/flows/planetTransfer';
  import PlanetTransferFlow from '$lib/flows/PlanetTransferFlow.svelte';
  import resolveFlow from '$lib/flows/resolve';
  import ResolveFlow from '$lib/flows/ResolveFlow.svelte';
  import FleetsToResolve from '$lib/components/fleets/FleetsToResolve.svelte';
  import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';

  import messageFlow from '$lib/flows/message';
  import MessageFlow from '$lib/flows/MessageFlow.svelte';
  import showPlanetDepartures from '$lib/flows/showPlanetDepartures';
  import ShowPlanetDeparturesFlow from '$lib/flows/ShowPlanetDeparturesFlow.svelte';
  import FirstTimeProfile from '$lib/flows/FirstTimeProfile.svelte';
  import {privateWallet} from '$lib/account/privateWallet';
  import {fleetList} from '$lib/space/fleets';
  import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
  import {time} from '$lib/time';

  import Search from '$lib/components/utils/Search.svelte';
  import PlanetEventList from './PlanetEventList.svelte';
  import {xyToLocation} from 'conquest-eth-common';
  import {overlays} from '$lib/map/overlays';
  import {conversations} from '$lib/missiv';
  import Help from '$lib/components/utils/Help.svelte';
  import {nativeTokenSymbol} from '$lib/config';

  // import {timeToText} from '$lib/utils';
  // import {spaceInfo} from '$lib/space/spaceInfo';
  // import {camera} from '$lib/map/camera';

  function time2text(numSeconds: number): string {
    if (numSeconds < 120) {
      return `${numSeconds} seconds`;
    } else if (numSeconds < 7200) {
      return `${Math.floor(numSeconds / 60)} minutes and ${numSeconds % 60} seconds`;
    } else {
      return `${Math.floor(numSeconds / 60 / 60)} hours and ${Math.floor((numSeconds % 3600) / 60)} minutes`;
    }
  }

  $: session =
    contractsInfos.contracts.OuterSpace.linkedData.bootstrapSessionEndTime > 0
      ? $time < contractsInfos.contracts.OuterSpace.linkedData.infinityStartTime
        ? $time >= contractsInfos.contracts.OuterSpace.linkedData.bootstrapSessionEndTime
          ? {ended: true, timeLeft: contractsInfos.contracts.OuterSpace.linkedData.infinityStartTime - $time}
          : $time >=
            contractsInfos.contracts.OuterSpace.linkedData.bootstrapSessionEndTime -
              contractsInfos.contracts.OuterSpace.linkedData.exitDuration
          ? {ended: false, timeLeft: contractsInfos.contracts.OuterSpace.linkedData.bootstrapSessionEndTime - $time}
          : undefined
        : undefined
      : undefined;
</script>

<Map />

{#if !$spaceQueryWithPendingActions.queryState.data?.loading && $spaceQueryWithPendingActions.queryState.data?.invalid}
  <div class="w-full flex items-center justify-center fixed top-0" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">
      Invalid Indexing Layer (subgraph) Space Not Ready. Please Contact us on <a
        href="https://discord.com/invite/Qb4gr2ekfr"
        class="underline">Discord</a
      >.
    </p>
  </div>
{:else if !$spaceQueryWithPendingActions.queryState.data?.loading && $spaceQueryWithPendingActions.queryState.data?.outofsync}
  <div class="w-full flex items-center justify-center fixed top-0 pointer-events-none" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">
      Indexing Layer (subgraph) Out Of Sync. ({$spaceQueryWithPendingActions.queryState.data?.outofsync.delta} block behind).
      Please Contact us on <a href="https://discord.com/invite/Qb4gr2ekfr" class="underline">Discord</a>.
    </p>
  </div>
{:else if !$spaceQueryWithPendingActions.queryState.data?.loading && !$spaceQueryWithPendingActions.queryState.data?.space}
  <div class="w-full flex items-center justify-center fixed top-0 pointer-events-none" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">
      Indexing Layer (subgraph) Space Not Ready. Please Wait...
    </p>
  </div>
{:else if $spaceQueryWithPendingActions.queryState.data?.loading || $fleetList.step === 'LOADING'}
  <div class="w-full flex items-center justify-center fixed top-0 pointer-events-none" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-blue-500 p-1">Loading</p>
  </div>
{/if}

<ConnectPanel />

<!-- <div class="opacity-40 bg-green-300 text-red-600 top-0 mx-auto z-50 absolute">
  CAMERA
  {#if $camera}
    {JSON.stringify(
      {
        x: Math.floor($camera.x * 100) / 100,
        y: Math.floor($camera.y * 100) / 100,
        zoom: $camera.zoom,
        renderX: Math.floor($camera.renderX * 100) / 100,
        renderY: Math.floor($camera.renderY * 100) / 100,
        renderWidth: Math.floor($camera.renderWidth * 100) / 100,
        renderHeight: Math.floor($camera.renderHeight * 100) / 100,
        width: Math.floor($camera.width * 100) / 100,
        height: Math.floor($camera.height * 100) / 100,
        renderScale: Math.floor($camera.renderScale * 100) / 100,
      },
      null,
      2
    )}
  {/if}
</div> -->

<div class="absolute right-0 top-12">
  <FleetsToResolve />
</div>

{#if $claimFlow.error || $claimFlow.step !== 'IDLE'}
  <ClaimFlow />
{/if}

{#if $sendFlow.error || $sendFlow.step !== 'IDLE'}
  <SendFlow />
{/if}

{#if $simulateFlow.error || $simulateFlow.step !== 'IDLE'}
  <SimulateFlow />
{/if}

{#if $resolveFlow.error || $resolveFlow.step !== 'IDLE'}
  <ResolveFlow />
{/if}

{#if $exitFlow.error || $exitFlow.step !== 'IDLE'}
  <ExitFlow />
{/if}

{#if $planetTransferFlow.error || $planetTransferFlow.step !== 'IDLE'}
  <PlanetTransferFlow />
{/if}

{#if $messageFlow.error || $messageFlow.step !== 'IDLE'}
  <MessageFlow />
{/if}

{#if $showPlanetDepartures.error || $showPlanetDepartures.step !== 'IDLE'}
  <ShowPlanetDeparturesFlow />
{/if}

{#if $privateWallet && $privateWallet.step === 'READY' && $conversations.registered.state == 'ready' && !$conversations.registered.user}
  <FirstTimeProfile />
{/if}

<!--
{:else if $selection.id}
  <PlanetInfoPanel location={$selection.id} />
{:else}
  <Search />
{/if} -->

<!-- December 7th 10AM UTC  -->
{#if contractsInfos.name === 'alpha' && $time < 1638871200}
  <Banner on:mounted={() => selection.unselect()} disableClose={true}>
    <p>
      Welcome to
      <span class="text-cyan-600">Conquest.eth</span>
      a <span class="text-cyan-100">persistent</span>
      <Help class="inline w-4" /> and <span class="text-cyan-100">permissionless</span>
      <Help class="inline w-4" /> game of diplomacy.
    </p>
    <p class="mt-3">
      The alpha starts in {time2text(1638871200 - $time)}. There will be <span class="text-yellow-500">5000$</span>
      worth of rewards. See our various blog post on our
      <a class="underline" href="https://medium.com/@etherplay">medium</a>
    </p>

    <p class="mt-3">
      If you want to participate, just join our <a class="underline" href="https://discord.gg/Qb4gr2ekfr">Discord</a>
    </p>
  </Banner>
{:else if $account.step === 'READY' && $account.remoteDisabledOrSynced && !bitMaskMatch($account.data?.welcomingStep, TutorialSteps.WELCOME)}
  <Banner on:mounted={() => selection.unselect()} on:close={() => account.recordWelcomingStep(TutorialSteps.WELCOME)}>
    <p>
      Welcome to
      <span class="text-cyan-600">Conquest.eth</span>
      a <span class="text-green-500">persistent</span>
      <Help class="inline w-4"
        >The game has no end. It will run as long as the decentralised network of computers it runs on continue to
        exists.</Help
      > and <span class="text-green-500">permissionless</span>
      <Help class="inline w-4"
        >The game do not run on any server. It runs a decentralised network and all its logic is imprinted on the
        network with no-one able to change its rules or prevent anyone from participating.</Help
      > game of diplomacy.
    </p>
    <p class="mt-3">
      To participate you'll have to first acquire planets by depositing a stake in form of
      <PlayCoin class="inline w-4" />
      (Play tokens). You do not not need to mint these token as they are minted automatically from {nativeTokenSymbol},
      the currency used by the network the game runs on.
    </p>
    <p class="mt-3">
      These planets will then produce spaceships that you can use to attack other planets. You'll also have to make sure
      you have enough spaceships to protect your planets. It is a good idea to reach out to other player and plan
      strategies together.
    </p>
    <p class="mt-3">
      At any time (whether you acquired the planet via staking or via attack), you can exit the planet. This take
      {timeToText(spaceInfo.exitDuration, {verbose: true})}
      during which you cannot use it but at the end of which you ll get the deposit, ready to be withdrawn.
    </p>
    <p class="mt-3 text-orange-400">
      Be careful, even though your planet will continue to produce spaceships, you can lose it while waiting for the
      exit period to end.
    </p>
    <p class="mt-5 text-lg text-green-400">
      And don't forget to check our <a
        target="_blank"
        rel="noreferrer,noopener"
        class="text-yellow-500 underline"
        href="https://knowledge.conquest.game">player manual</a
      >
    </p>
  </Banner>
{:else if $selection}
  <PlanetInfoPanel coords={$selection} />
  <PlanetEventList location={xyToLocation($selection.x, $selection.y)} />
{:else}
  <Search />
{/if}
<div class="flex right-0 bottom-0 md:top-0 absolute md:right-1/4 lists">
  <div class="md:flex ">
    <PlanetsListPanel />
    <FleetsList />
    <EventsList />
    <div class="flex-col">
      <div
        class="top-0 md:p-3 p-1  w-32 text-center relative bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300 mt-4 text-sm"
      >
        <p class="text-white text-xs"><input type="checkbox" bind:checked={$overlays.fleets} /> Fleet</p>
        <p class="text-white text-xs"><input type="checkbox" bind:checked={$overlays.alliances} /> alliances</p>
        <p class="text-white text-xs"><input type="checkbox" bind:checked={$overlays.sectors} /> sectors</p>
        <p class="text-white text-xs">
          <label for="planetOwners">Owners:</label>
          <select
            id="planetOwners"
            style={`
              background: black;
              color: white;
          `}
            bind:value={$overlays.planetOwners}
          >
            <option value="Everyone"> Everyone </option>
            <option value="OnlyYou"> Your </option>
            <option value="OnlyAllies"> Allies</option>
            <!-- <option value="None">None</option> -->
          </select>
        </p>
      </div>
    </div>
  </div>
</div>

{#if session}
  <div class="bg-black text-red-500 bottom-0 z-50 w-full text-lg fixed text-center border-red-400">
    {#if session.ended}
      Session has ended, Infinite version start in {time2text(session.timeLeft)}
    {:else if session.timeLeft < contractsInfos.contracts.OuterSpace.linkedData.timePerDistance}
      Session is going to end , last time to reveal your fleet, No time for sending fleet anymore!
    {:else}
      Session ends in {time2text(session.timeLeft)}. Last time to send your fleets!
    {/if}
  </div>
{/if}

<style>
  @media (min-width: 768px) {
    .lists {
      height: 100px;
    }
  }
</style>
