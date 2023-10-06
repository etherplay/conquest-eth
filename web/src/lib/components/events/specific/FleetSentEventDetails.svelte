<script lang="ts">
  import type {FleetSentParsedEvent} from '$lib/space/subgraphTypes';
  import Blockie from '$lib/components/account/Blockie.svelte';
  import Coord from '$lib/components/utils/Coord.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {time} from '$lib/time';

  import {timeToText} from '$lib/utils';
  import type {PlanetInfo} from 'conquest-eth-common';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {wallet} from '$lib/blockchain/wallet';
  import {planets} from '$lib/space/planets';

  export let event: FleetSentParsedEvent;

  let sender: string;
  let owner: string | undefined;
  let origin: PlanetInfo | undefined;
  let walletIsSender: boolean;
  let walletIsOwner: boolean;
  let walletIsBothOwnerAndSender: boolean;
  let walletIsNeither: boolean;

  $: {
    sender = event.sender.id;
    owner = event.owner.id;
    origin = spaceInfo.getPlanetInfoViaId(event.planet.id);
    const walletAddress = $wallet.address?.toLowerCase();
    walletIsBothOwnerAndSender = walletAddress === sender && sender === owner;
    walletIsOwner = walletAddress === owner;
    walletIsSender = walletAddress === sender;
    walletIsNeither = !walletIsOwner && !walletIsSender;
  }
</script>

<div class="bg-black shadow sm:rounded-lg">
  <div class="px-4 py-5 sm:px-6">
    <h3 class="text-lg leading-6 font-medium text-red-400">
      {#if walletIsBothOwnerAndSender || walletIsOwner}
        <span class="text-green-500">Your Fleet of {event.quantity} spaceships has been sent away </span>
      {:else if walletIsSender}
        <span class="text-blue-500"
          >Fleet Sent For <Blockie address={owner} /> with {event.quantity} spaceships
        </span>{:else}Fleet of {event.quantity} spaceships has been sent away!{/if}
      {#if walletIsOwner && !walletIsSender}
        <span class="text-gray-100">(Sent by <Blockie address={sender} /> )</span>
      {/if}
    </h3>
    <p class="mt-1 max-w-2xl text-sm text-gray-500">{timeToText($time - event.timestamp, {compact: true})} ago</p>
  </div>
  <div class="border-t border-gray-800 px-4 py-5 sm:p-0">
    <dl class="sm:divide-y sm:divide-gray-800">
      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Sender / Owner</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <Blockie class="ml-2 w-6 h-6 inline my-1/2 mr-2" address={sender} />{#if owner && owner !== sender}
            <spam class="text-white">&gt;</spam> <Blockie class="w-6 h-6 inline my-1/2 mr-2" address={owner} />{/if}
        </dd>
      </div>

      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Origin</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <p class="mb-1"><Coord location={origin.location.id} /> {origin.stats.name}</p>
        </dd>
      </div>

      <!-- TODO prediction ?-->
      <!-- <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Attack</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <p class="text-gray-100">
            {event.quantity - event.inFlightFleetLoss - event.taxLoss} spaceships arrived
          </p>

          {#if event.taxLoss}<p class="text-red-400">
              no alliance: taxed {spaceInfo.giftTaxPer10000 / 100}% ( - {event.taxLoss} )
            </p>{/if}
          {#if event.inFlightFleetLoss}
            <p class="text-red-400">
              ({event.inFlightFleetLoss} spaceships was also destroyed at origin (<Coord
                location={origin.location.id}
              />))
            </p>{/if}

          {#if event.accumulatedAttackAdded}
            <p class="text-yellow-500">
              The attack was combined with previous one adding {event.accumulatedAttackAdded} spaceships.
            </p>
          {/if}

          <p class="my-1 text-md">
            Total: {event.quantity - event.inFlightFleetLoss - event.taxLoss + event.accumulatedAttackAdded}
          </p>
        </dd>
      </div> -->

      <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt class="text-sm font-medium text-gray-500">Transaction</dt>
        <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
          <a
            href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${event.transaction.id}`}
            target="_blank"
            class="text-indigo-600 hover:text-indigo-100">{event.transaction.id}</a
          >
        </dd>
      </div>
    </dl>
  </div>
</div>
