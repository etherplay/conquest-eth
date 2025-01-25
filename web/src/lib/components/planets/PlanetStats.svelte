<script lang="ts">
  export let planetState: Readable<PlanetState>;
  export let planetInfo: PlanetInfo;
  export let copiedDirection = 'right';

  import Blockie from '$lib/components/account/Blockie.svelte';
  import Stat from '$lib/components/utils/Stat.svelte';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {timeToText} from '$lib/utils';
  import Help from '$lib/components/utils/Help.svelte';
  import NegativeStat from '../utils/NegativeStat.svelte';
  import {wallet} from '$lib/blockchain/wallet';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import type {PlanetInfo, PlanetState} from 'conquest-eth-common';
  import type {Readable} from 'svelte/store';
  import Copiable from '../generic/Copiable.svelte';
  import {time} from '$lib/time';

  $: walletIsOwner = $wallet.address && $wallet.address?.toLowerCase() === $planetState?.owner?.toLowerCase();
  $: textColor =
    $planetState && $planetState.owner ? (walletIsOwner ? 'text-green-500' : 'text-red-500') : 'text-gray-100';

  $: frameBGColor = $planetState && $planetState.owner ? (walletIsOwner ? 'bg-cyan-300' : 'bg-red-500') : 'bg-cyan-300';

  $: capacityReached = $planetState
    ? spaceInfo.productionCapAsDuration &&
      spaceInfo.productionCapAsDuration > 0 &&
      $planetState.numSpaceships >= planetInfo.stats.cap
    : false;

  $: productionColor =
    capacityReached || !$planetState?.active
      ? ' text-red-600'
      : $planetState?.travelingUpkeep > 0
      ? 'text-amber-500'
      : 'text-green-500';
</script>

<div class="flex m-1">
  {#if $planetState && $planetState.owner}
    <h2 class={`flex-auto text-center pt-1 font-bold ${textColor} inline`}>{planetInfo.stats.name}</h2>
    <!-- <Tooltip class={`flex-auto text-center pt-1 font-bold ${textColor} inline`}>
      <h2>{planetInfo.stats.name}</h2>
      <p slot="tooltip">{planetInfo.location.id}</p>
    </Tooltip> -->
    <div>
      <Blockie {copiedDirection} class="flex-auto w-8 h-8 flot" address={$planetState.owner} />
    </div>
  {:else}
    <h2 class={`flex-auto text-center pt-1 font-bold ${textColor} inline`}>{planetInfo.stats.name}</h2>
    <!-- <Tooltip class={`flex-auto text-center pt-1 font-bold ${textColor} inline`}>
      <h2 class="flex-auto  ${textColor} text-center pt-1 font-bold">{planetInfo.stats.name}</h2>
      <p slot="tooltip">{planetInfo.location.id}</p>
    </Tooltip> -->
  {/if}
</div>
<p class={`flex-auto text-center -m-2 font-bold text-white`}>
  <Copiable text={`${planetInfo.location.x},${planetInfo.location.y}`}>
    {#if $planetState && $planetState.owner}
      <span style="user-select: all; cursor: pointer;">{planetInfo.location.x},{planetInfo.location.y}</span>
    {:else}
      <span style="user-select: all; cursor: pointer;">{planetInfo.location.x},{planetInfo.location.y}</span>
    {/if}
  </Copiable>
</p>
<div class="w-full h-1 bg-cyan-300 my-2" />

<div class="m-2 text-xs ">
  {#if $planetState}
    <!-- if active-->
    <!-- <div class="m-1">
      <label for="active">active:</label>
      <span id="active" class="value">{$planetState.active}</span>
    </div> -->
    {#if $planetState.exiting}
      <div class="m-1 w-26 md:w-36 flex justify-between text-red-400">
        <p class="p-0 mb-1">Exiting in:</p>
        <p class="p-0 mb-1">{timeToText($planetState.exitTimeLeft)}</p>
      </div>
    {:else if $planetState.flagTime > 0}
      <div class="m-1 w-26 md:w-36 flex justify-between text-green-300">
        <p class="p-0 mb-1">Free until:</p>
        <p class="p-0 mb-1">
          {timeToText($planetState.flagTime + (6 * 24 * 3600) / spaceInfo.productionSpeedUp - $time)}
        </p>
      </div>
    {/if}

    <!-- {#if $planetState?.requireClaimAcknowledgement}
      <button on:click={() => acknowledgeClaim($planetState?.requireClaimAcknowledgement)}>OK</button>
    {/if} -->
  {/if}

  <!-- {#if !$planetState || $planetState.natives}
    <div class="m-1">
      <label for="natives">natives:</label>
      <span id="natives" class="value">{planetInfo.stats.natives}</span>
    </div>
  {:else}
    <div class="m-1">
      <label for="numSpaceships">spaceships:</label>
      <span
        id="numSpaceships"
        class="value">{$planetState.numSpaceships}</span>
    </div>
  {/if} -->

  {#if spaceInfo.productionCapAsDuration && spaceInfo.productionCapAsDuration > 0}
    <div class={`m-1 w-26 md:w-36 flex justify-between text-white`}>
      <p class="p-0 mb-1 text-white">
        Capacity
        <Help class="inline w-4 h-4">
          The planet will stop producing planet when it carries that many spaceships. The spaceships number will
          actually decrease to reach that capacity at a rate that grow with the number of spaceship it received above
          the capacity.
        </Help>:
      </p>
      <p class={`p-0 mb-1${capacityReached ? ' text-red-600' : ' text-white'}`}>
        {planetInfo.stats.cap}
      </p>
    </div>
  {/if}

  <div class={'m-1 w-26 md:w-36 flex justify-between' + ($planetState?.active ? ' text-green-400' : ' text-gray-400')}>
    {#if !$planetState}
      <p class="p-0 mb-1">loading ...</p>
    {:else if $planetState.natives}
      <p class="p-0 mb-1">
        Natives
        <Help class="inline w-4 h-4">
          When a planet is not owned by anyone, it has some natives population that need to be conquered.
        </Help>
      </p>
      <p class="p-0 mb-1">{planetInfo.stats.natives}</p>
    {:else}
      <p class={`p-0 mb-1 ${productionColor}`}>
        Spaceships
        <Help class="inline w-4 h-4">
          The number of spaceships present on the planet. These spaceships can be used for attacks or left on the planet
          for defense. When a planet is active, that it is, a stake has been deposited, it continuosly produce new
          spaceships.
        </Help>
      </p>
      <p class={`p-0 mb-1 ${productionColor}`}>{$planetState.numSpaceships}</p>
    {/if}
  </div>
  <!-- {#if capacityReached}
    <p class="p-0 mb-1">{$planetState.overflow + planetInfo.stats.cap}</p>
    <p>Decrease Rate: {Math.floor(($planetState.overflow * 1800) / planetInfo.stats.cap)}</p>
  {/if} -->

  <!-- <div class={`m-1 w-26 md:w-36 flex justify-between text-white`}>
    <p class="p-0 mb-1 text-white">
      Upkeep
      <Help class="inline w-4 h-4" />:
    </p>
    <p class={`p-0 mb-1${$planetState.travelingUpkeep > 0 ? ' text-red-600' : ' text-green-600'}`}>
      {$planetState.travelingUpkeep}
    </p>
  </div> -->

  {#if $planetState}
    <NegativeStat
      name="Upkeep"
      value={$planetState.travelingUpkeep}
      max={planetInfo.stats.maxTravelingUpkeep}
      min={-planetInfo.stats.maxTravelingUpkeep}
    >
      <Help class="inline w-4 h-4"
        >When fleets are traveling, the planet need to keep maintaining it. When the upkeep is green you can send some
        spaceships and continue to produce at full capacity. When it is red (after sending fleets), the planet produce
        at half power until all ukeeep is paid for</Help
      >
    </NegativeStat>
  {/if}

  <div class="m-1 w-26 md:w-36 text-yellow-400 ">
    <div class="w-full box-border">
      <p class="p-0 mb-1">
        Stake
        <Help class="inline w-4 h-4">
          This is the amount of
          <PlayCoin class="inline w-4" />
          required to stake to produce spaceships. This is also the amount that you (or someone capturing the planet) can
          withdraw back after exiting the planet.
        </Help>
      </p>
      <p class="float-right relative -top-6">
        {planetInfo.stats.stake / 10000}
        <PlayCoin class="inline w-4" />
      </p>
      <div class="box-border rounded-md bg-gray-600">
        <div
          class="w-full h-3 rounded-md bg-yellow-400"
          style="width: {Math.floor(
            ((planetInfo.stats.stake / 10000) * 100) /
              ((spaceInfo.stakeRangeArray[spaceInfo.stakeRangeArray.length - 1] * spaceInfo.stakeMultiplier10000th) /
                10000)
          )}%;"
        />
      </div>
    </div>
  </div>
  <Stat name="Production" value={planetInfo.stats.production} max={12000} min={1500}>
    <Help class="inline w-4 h-4">This is the rate of spaceship production per hour.</Help>
  </Stat>
  <Stat name="Attack" value={planetInfo.stats.attack} max={10000} min={3600}>
    <Help class="inline w-4 h-4">This is the attack strength of spaceships departing from this planet.</Help>
  </Stat>
  <Stat name="Defense" value={planetInfo.stats.defense} max={10000} min={3600}>
    <Help class="inline w-4 h-4">This is the defense strength of spaceships defending this planet.</Help>
  </Stat>
  <Stat name="Speed" value={planetInfo.stats.speed} max={10000} min={4500}>
    <Help class="inline w-4 h-4">
      This is the speed at which spaceship departing from this planet travels in unit per hour.
    </Help>
  </Stat>
</div>
