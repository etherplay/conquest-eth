<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import sendFlow from '$lib/flows/send';
  import {onMount} from 'svelte';

  import {planets} from '$lib/space/planets';
  import {spaceInfo} from '$lib/space/spaceInfo';

  import {timeToText} from '$lib/utils';
  import {time, now} from '$lib/time';
  import {url} from '$lib/utils/url';
  import Help from '../utils/Help.svelte';
  import {agentService} from '$lib/account/agentService';
  import {account} from '$lib/account/account';
  import AttackSendTabButton from './AttackSendTabButton.svelte';
  import {playersQuery} from '$lib/space/playersQuery';
  import Blockie from '../account/Blockie.svelte';
  import {wallet} from '$lib/blockchain/wallet';
  import Flatpickr from '../flatpickr/Flatpickr.svelte';
  import confirmDatePlugin from 'flatpickr/dist/plugins/confirmDate/confirmDate.js';
  import type {Outcome} from 'conquest-eth-common';
  import {planetFutureStates} from '$lib/space/planetsFuture';
  import {options} from '$lib/config';

  let travelingFleetSelected: string | undefined = undefined;
  function onTravelingFleetSelected(event: Event) {
    if (travelingFleetSelected) {
      arrivalTimeWanted = new Date(parseInt(travelingFleetSelected) * 1000);
      formatted_arrivalTimeWanted = arrivalTimeWanted.toLocaleString();
    } else {
      arrivalTimeWanted = undefined;
      formatted_arrivalTimeWanted = undefined;
    }
  }

  let useAgentService = false;
  let gift = false;

  let fleetOwnerSpecified: string | undefined;
  let arrivalTimeWanted: Date;
  let formatted_arrivalTimeWanted: string;

  onMount(() => {
    fleetOwnerSpecified = $sendFlow.data?.config?.fleetOwner;
  });

  // TODO investigate why there is need to check sendFlow.data.from ? might need to do the same to sendFlow.data.to below
  $: fromPlanetInfo = $sendFlow.data?.from && spaceInfo.getPlanetInfo($sendFlow.data?.from.x, $sendFlow.data?.from.y);
  $: fromPlanetState = fromPlanetInfo && planets.planetStateFor(fromPlanetInfo);

  $: fleetOwner = fleetOwnerSpecified
    ? fleetOwnerSpecified
    : $sendFlow.data?.config?.fleetOwner || $fromPlanetState?.owner;
  $: fleetSender = $fromPlanetState?.owner;

  $: toPlanetInfo = spaceInfo.getPlanetInfo($sendFlow.data?.to.x, $sendFlow.data?.to.y);
  $: toPlanetState = planets.planetStateFor(toPlanetInfo);

  $: planetFutures = planetFutureStates.futureStatesFor(toPlanetInfo);

  $: currentFutures = $planetFutures.filter((v) => v.fleet.timeLeft > defaultTimeToArrive - 5 * 60);

  $: travelingArrivals = currentFutures
    .filter((v) => v.fleet.arrivalTimeWanted > 0 && v.fleet.arrivalTimeWanted - now() > -5 * 60)
    .map((v) => v.fleet.arrivalTimeWanted)
    .reduce((prev, curr) => {
      if (prev.indexOf(curr) === -1) {
        prev.push(curr);
      }
      return prev;
    }, []);

  $: futureStatesAtFleetArrival = currentFutures.filter(
    (v) => v.fleet.timeLeft <= (currentTimeToArrive > defaultTimeToArrive ? currentTimeToArrive : defaultTimeToArrive)
  );

  $: futureState =
    futureStatesAtFleetArrival.length > 0
      ? futureStatesAtFleetArrival[futureStatesAtFleetArrival.length - 1]
      : undefined;

  $: toPlayer = $playersQuery.data?.players[$toPlanetState?.owner?.toLowerCase()];
  $: fromPlayer = $playersQuery.data?.players[fleetOwner.toLowerCase()];
  $: senderPlayer = $playersQuery.data?.players[fleetSender.toLowerCase()];

  // $: console.log({fromPlayer, fleetOwner});

  $: canSpecifyFleetOwner =
    !$sendFlow.data?.config?.abi ||
    ($sendFlow.data?.config?.args && $sendFlow.data?.config?.args.includes('{fleetOwner}'));

  // TODO maxSpaceshipsLoaded and invalid message if maxSpaceships == 0
  let fleetAmountSet = false;
  let fleetAmount = 1;
  let maxSpaceships: number;
  $: {
    maxSpaceships = $fromPlanetState
      ? Math.max(0, $fromPlanetState.numSpaceships - ($sendFlow.data?.config?.numSpaceshipsToKeep || 0))
      : 0;

    if ($fromPlanetState && $fromPlanetState.numSpaceships > fromPlanetInfo.stats.cap) {
      const timePassed = Math.max((5 * 60) / spaceInfo.productionSpeedUp, 60);

      let decreaseRate = 1800;
      if ($fromPlanetState.overflow > 0) {
        decreaseRate = Math.floor(($fromPlanetState.overflow * 1800) / fromPlanetInfo.stats.cap);
        if (decreaseRate < 1800) {
          decreaseRate = 1800;
        }
      }

      let decrease = Math.floor((timePassed * spaceInfo.productionSpeedUp * decreaseRate) / 3600);
      if (decrease > $fromPlanetState.numSpaceships - fromPlanetInfo.stats.cap) {
        decrease = $fromPlanetState.numSpaceships - fromPlanetInfo.stats.cap;
      }
      maxSpaceships -= decrease;
    }

    if ($sendFlow.data?.config?.numSpaceshipsAvailable) {
      maxSpaceships = Math.min(maxSpaceships, $sendFlow.data?.config?.numSpaceshipsAvailable);
    }
    if (maxSpaceships > 0 && !fleetAmountSet) {
      // TODO loading
      fleetAmount = Math.floor(maxSpaceships / 2);
      fleetAmountSet = true;
    }

    if (fleetAmount > maxSpaceships) {
      fleetAmount = maxSpaceships;
    }
  }

  $: agentServiceAccount = $agentService.account;

  let useAgentServiceInitialised = false;
  $: if (
    !useAgentServiceInitialised &&
    account.isAgentServiceActivatedByDefault() &&
    !(!agentServiceAccount || agentServiceAccount.requireTopUp || !agentServiceAccount.remoteAccount)
  ) {
    useAgentService = true;
    useAgentServiceInitialised = true;
  }

  $: defaultTimeToArrive = spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo);

  $: currentTimeToArrive = arrivalTimeWanted
    ? arrivalTimeWanted.getTime() / 1000 - $time > defaultTimeToArrive
      ? arrivalTimeWanted.getTime() / 1000 - $time
      : defaultTimeToArrive
    : defaultTimeToArrive;

  $: currentTimeToArriveFormatted = timeToText(currentTimeToArrive);

  $: actualDefaultArrivalDateTime = defaultTimeToArrive + $time;

  $: defaultArrivalDateTime = Math.ceil((defaultTimeToArrive + $time) / 60) * 60 + 1 * 60;

  $: currentArrivalDateTime = Math.ceil((currentTimeToArrive + $time) / 60) * 60 + 1 * 60;

  let endOfSessionWarning: false | 'warning' | 'impossible' = false;
  $: {
    endOfSessionWarning = false;
    if (spaceInfo.bootstrapSessionEndTime > 0) {
      if ($time < spaceInfo.infinityStartTime) {
        if (currentArrivalDateTime > spaceInfo.bootstrapSessionEndTime) {
          endOfSessionWarning = 'impossible';
        } else if (currentArrivalDateTime > spaceInfo.bootstrapSessionEndTime - 30 * 60) {
          endOfSessionWarning = 'warning';
        }
      }
    }
  }

  let attentionRequired: 'TIME_PASSED' | undefined;
  $: {
    if (travelingFleetSelected) {
      // TODO DIY 5 * 60
      if (arrivalTimeWanted && arrivalTimeWanted.getTime() / 1000 < actualDefaultArrivalDateTime - 5 * 60) {
        arrivalTimeWanted = undefined;
        attentionRequired = 'TIME_PASSED';
      }
    } else if (arrivalTimeWanted && arrivalTimeWanted.getTime() / 1000 < actualDefaultArrivalDateTime) {
      arrivalTimeWanted = undefined;
      attentionRequired = 'TIME_PASSED';
    }
  }

  let prediction:
    | {
        numSpaceshipsAtArrival: {max: number; min: number};
        outcome: Outcome;
      }
    | undefined = undefined;
  $: {
    if (toPlanetState && fromPlanetState) {
      prediction = {
        numSpaceshipsAtArrival: spaceInfo.numSpaceshipsAtArrival(
          toPlanetInfo,
          $toPlanetState,
          currentTimeToArrive > defaultTimeToArrive ? currentTimeToArrive : defaultTimeToArrive
        ),
        outcome: spaceInfo.outcome(
          fromPlanetInfo,
          toPlanetInfo,
          $toPlanetState,
          fleetAmount,
          currentTimeToArrive > defaultTimeToArrive ? currentTimeToArrive : defaultTimeToArrive,
          senderPlayer,
          fromPlayer,
          toPlayer,
          gift
        ),
      };
    }
  }

  let futurePrediction:
    | {
        numSpaceshipsAtArrival: {max: number; min: number};
        outcome: Outcome;
      }
    | undefined = undefined;
  $: {
    futurePrediction = undefined;
    if (!gift && futureState && futureState.state) {
      let giving = futureState.state.owner.toLowerCase() === fleetOwner.toLowerCase(); // TODO more complex scenario
      let extraAttack = 0;
      let extra = undefined;
      if (
        !giving &&
        arrivalTimeWanted &&
        Math.floor(arrivalTimeWanted.getTime() / 1000) === futureState.fleet.arrivalTimeWanted
      ) {
        extra = {
          attackPowerOverride: Math.floor(
            (futureState.accumulatedAttack * futureState.averageAttackPower +
              fleetAmount * fromPlanetInfo.stats.attack) /
              (fleetAmount + futureState.accumulatedAttack)
          ),
          defense: futureState.accumulatedDefense,
        };
        extraAttack = futureState.accumulatedAttack;
      }
      futurePrediction = {
        numSpaceshipsAtArrival: {min: futureState.state.numSpaceships, max: futureState.state.numSpaceships}, // TODO max
        outcome: spaceInfo.outcome(
          fromPlanetInfo,
          toPlanetInfo,
          futureState.state,
          fleetAmount + extraAttack,
          currentTimeToArrive + $time - futureState.arrivalTime,
          senderPlayer,
          fromPlayer,
          playersQuery.getPlayer(futureState.state.owner),
          giving,
          undefined, //TODO ?
          extra
        ),
      };
    }
  }

  $: flatpickrOptions = flatpickrOptions
    ? flatpickrOptions
    : defaultTimeToArrive
    ? {
        enableTime: true,
        minDate: defaultArrivalDateTime * 1000,
        defaultDate: new Date(defaultArrivalDateTime * 1000).toDateString(),
        defaultSecond: 0,
        time_24hr: true,
        minuteIncrement: 1,
        plugins: [
          confirmDatePlugin({
            confirmText: 'OK ',
            showAlways: false,
          }),
        ],
      }
    : undefined;

  // $: {
  //   console.log({
  //     $time,
  //     defaultTimeToArrive,
  //     arrivalTimeWantedString: arrivalTimeWanted?.toISOString(),
  //     currentTimeToArrive,
  //     arrivalTimeWanted: arrivalTimeWanted?.getTime() / 1000,
  //     arrivalTimeWantedDate: arrivalTimeWanted,
  //     minDate: flatpickrOptions?.minDate
  //   })
  // }

  let confirmDisabled = false;
  $: {
    if (toPlanetState) {
      confirmDisabled = prediction?.outcome.nativeResist;
    }
    if (endOfSessionWarning === 'impossible') {
      confirmDisabled = true;
    }
  }

  $: warning =
    !gift && $toPlanetState?.owner === $wallet.address?.toLowerCase()
      ? 'You are atrempting to attack yourself! You need to select a different fleetOwner'
      : !gift && prediction && prediction.outcome.allies
      ? 'You are attacking an ally!'
      : gift && prediction && !prediction.outcome.allies
      ? 'Your are giving spaceship to a potential enemy!'
      : '';

  $: warningNote =
    !gift && $toPlanetState?.owner === $wallet.address?.toLowerCase()
      ? '(will attack anyone if ownership changes)'
      : '';

  $: border_color = gift ? 'border-cyan-300' : 'border-red-500';
  $: text_color = gift ? 'text-cyan-300' : 'text-red-500';

  onMount(() => {
    fleetOwnerSpecified = undefined;
    useAgentService = account.isAgentServiceActivatedByDefault();
    fleetAmount = 1;
    fleetAmountSet = false;
    gift = sendFlow.isGift();
  });

  function useSend() {
    if ($toPlanetState.owner) {
      gift = true;
    }
  }

  function useAttack() {
    // if (fleetOwner.toLowerCase() != $toPlanetState.owner.toLowerCase()) {
    gift = false;
    // }
  }
</script>

{#if attentionRequired}
  <Modal {border_color} on:close={() => (attentionRequired = undefined)}>
    <div class="text-center">
      <p class="pb-4">Popup Idle, please review information</p>
      <PanelButton label="OK" on:click={() => (attentionRequired = undefined)}>OK</PanelButton>
    </div>
  </Modal>
{:else}
  <!-- TODO Remove on:confirm, see button below -->
  <Modal {border_color} on:close={() => sendFlow.back()}>
    <!-- <h2 slot="header">Stake on Planet {location.x},{location.y}</h2> -->

    <nav class="relative z-0 mb-5 rounded-lg shadow flex divide-x divide-gray-700" aria-label="Tabs">
      <!-- Current: "text-gray-900", Default: "text-gray-500 hover:text-gray-700" -->
      <AttackSendTabButton disabled={fleetOwner === $toPlanetState.owner} active={!gift} on:click={useAttack}
        >Attack</AttackSendTabButton
      >
      <AttackSendTabButton active={gift} on:click={useSend}>Give</AttackSendTabButton>
    </nav>
    {#if warning}
      <div class="text-center text-yellow-600">
        {warning}
        {#if warningNote}<span class="text-xs">{warningNote}</span>{/if}
      </div>
    {/if}
    <div class="text-center">
      <p class="font-bold">How many spaceships?</p>
    </div>
    <div class="my-2 bg-cyan-300 border-cyan-300 w-full h-1" />

    <div>
      <div class="text-center">
        <!-- TODO show Token balance and warn when cannot buy // Token balance could be shown in navbar (once connected)-->
        <input
          class="text-cyan-300 bg-cyan-300"
          type="range"
          id="fleetAmount"
          name="fleetAmount"
          bind:value={fleetAmount}
          min="1"
          max={maxSpaceships}
        />
        <!-- <label for="fleetAmount">Number Of Spaceships</label> -->
        <input class="bg-gray-700 border-cyan-800 border-2" type="text" id="textInput" bind:value={fleetAmount} />
      </div>

      <div class="flex flex-row justify-center">
        <span>
          {#if prediction?.outcome.tax?.loss > 0}
            <span class="text-red-500"
              >{`( ${fleetAmount} - ${prediction?.outcome.tax?.loss} (${
                prediction?.outcome.tax?.taxRate / 100
              }% tax))`}</span
            >
            = {fleetAmount - prediction?.outcome.tax?.loss}
          {/if}
        </span>
      </div>
      <div class="my-2 bg-cyan-300 border-cyan-300 w-full h-1" />

      <div class="text-center">
        {#if flatpickrOptions}
          <!-- {new Date(arrivalTimeWanted).getTime() / 1000} -->
          <Flatpickr
            class="bg-gray-800 text-cyan-500 inline-block"
            options={flatpickrOptions}
            bind:value={arrivalTimeWanted}
            bind:formattedValue={formatted_arrivalTimeWanted}
            on:change={() => (travelingFleetSelected = '')}
            name="arrivalTimeWanted"
            placeholder="Arrival Time"
            ><Help class="w-6 h-6"
              >You can specify a specific arrival time. If you use the same exact arrival time for multiple fleets,
              they'll combine their attack making bigger damage that if sent one by one. This also work with yout
              allies, in which case, you'll need to pick the same address for "fleetOwner" (See below) that will own the
              planet being attacked in case of success.</Help
            ></Flatpickr
          >
        {/if}
      </div>

      {#if travelingArrivals.length > 0}
        <select
          class="bg-black mx-auto"
          name="Fleet"
          id="travelingFleets"
          bind:value={travelingFleetSelected}
          on:change={onTravelingFleetSelected}
        >
          <option value="">Or Pick a Traveling Fleet</option>
          {#each travelingArrivals as arrival}
            <option value={arrival}>{new Date(arrival * 1000).toLocaleString()}</option>
          {/each}
        </select>
      {/if}

      <!-- {travelingFleetSelected} -->

      <div class="my-2 bg-cyan-300 border-cyan-300 w-full h-1" />

      {#if !gift}
        {#if fleetOwner && fleetOwner.toLowerCase() !== $wallet.address?.toLowerCase()}
          <div class="text-center mb-2">
            sending as : <Blockie
              class="inline-block w-8 h-8"
              address={fleetOwnerSpecified || $sendFlow.data?.config?.fleetOwner || $wallet.address}
            />
          </div>
        {/if}

        {#if canSpecifyFleetOwner}
          <div class="text-center">
            Fleet Owner
            <input
              class="text-cyan-300 bg-black"
              type="text"
              id="fleetOwnerSpecified"
              name="fleetOwnerSpecified"
              bind:value={fleetOwnerSpecified}
            />
            <Help class="w-6 h-6"
              >You can pick a fleetOwner, different than your own wallet address. The attack will then be performed on
              its behalf and will be the owner of the planet being attacked if successful. Note that if the fleetOwner
              chosen is not an ally, a burn tax will be applied as usual.</Help
            >
          </div>
        {/if}
      {/if}

      {#if fromPlanetInfo && toPlanetInfo}
        <div class="flex flex-col">
          <div class="flex flex-row justify-between">
            <span class="text-green-600">{fromPlanetInfo.stats.name}</span>
            <svg class="w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span class="text-green-600 text-right">{toPlanetInfo.stats.name}</span>
          </div>

          <div class="flex flex-row justify-between mt-2 text-xs text-gray-500">
            <span>Spaceships</span><span class="text-right">Spaceships</span>
          </div>
          <div class="flex flex-row justify-between">
            <span>{$fromPlanetState.numSpaceships}</span><span class="text-right">{$toPlanetState.numSpaceships}</span>
          </div>

          {#if !gift}
            <div class="flex flex-row justify-between mt-2 text-xs text-gray-500">
              <span>Attack</span><span class="text-right">Defense</span>
            </div>
            <div class="flex flex-row justify-between">
              <span>{fromPlanetInfo.stats.attack}</span><span class="text-right">{toPlanetInfo.stats.defense}</span>
            </div>

            <div class="flex flex-row justify-between mt-2 text-xs text-gray-500">
              <span>Arrives in</span><span class="text-right">Spaceships Then</span>
            </div>
            <div class="flex flex-row justify-between">
              <span>{currentTimeToArriveFormatted}</span><span class="text-right"
                >{prediction?.numSpaceshipsAtArrival.min}</span
              >
            </div>

            <div class="flex flex-row  justify-center mt-2 text-xs text-gray-500">
              <span>Predicted outcome at time of arrival</span>
            </div>
            <div class="flex flex-row justify-center">
              {#if endOfSessionWarning === 'impossible'}
                <span class="text-red-400">Will not arrive before the end of session</span>
              {:else if endOfSessionWarning === 'warning'}
                <span class="text-orange-400">Might not arrive before the end of session (30 min risk)</span>
              {:else if prediction?.outcome.min.captured}
                <span class="text-green-600">{prediction?.outcome.min.numSpaceshipsLeft} (captured)</span>
              {:else if prediction?.outcome.nativeResist}
                <span class="text-red-400">{prediction?.outcome.min.numSpaceshipsLeft} (native population resists)</span
                >
              {:else}<span class="text-red-400">{prediction?.outcome.min.numSpaceshipsLeft} (attack failed)</span>{/if}
            </div>
            {#if prediction?.outcome.min.captured && prediction?.outcome.timeUntilFails > 0}
              <div class="flex flex-row justify-center">
                <span class="text-red-600">
                  attack fails if resolved
                  {timeToText(prediction?.outcome.timeUntilFails)}
                  late</span
                >
              </div>
            {/if}
          {:else}
            <!-- <div class="flex flex-row justify-center">
              <span
                >will receive {fleetAmount - prediction?.outcome.tax?.loss}
                {#if prediction?.outcome.tax?.loss > 0}
                  <span class="text-red-500"
                    >{`( ${fleetAmount} - ${prediction?.outcome.tax?.loss} (${
                      prediction?.outcome.tax?.taxRate / 100
                    }% tax))`}</span
                  >
                {/if}
              </span>
            </div> -->

            <div class="flex flex-row justify-between mt-2 text-xs text-gray-500">
              <span>Arrives in</span><span class="text-right">Spaceships Then</span>
            </div>
            <div class="flex flex-row justify-between">
              <span>{currentTimeToArriveFormatted}</span><span class="text-right"
                >{prediction?.outcome.min.numSpaceshipsLeft || 0}</span
              >
            </div>

            <div class="flex flex-row justify-center">
              {#if endOfSessionWarning === 'impossible'}
                <span class="text-red-400">Will not arrive before the end of session</span>
              {:else if endOfSessionWarning === 'warning'}
                <span class="text-orange-400">Might not arrive before the end of session (30 min risk)</span>
              {/if}
            </div>
          {/if}
        </div>
        <div class="my-2 bg-cyan-300 border-cyan-300 w-full h-1" />

        {#if futurePrediction}
          <div class="flex flex-row  justify-center mt-2 text-xs text-yellow-500">
            <span>Predicted outcome Including Traveling Fleets</span>
          </div>
          <div class="flex flex-row  justify-center mt-0 mb-1 text-xs text-yellow-700">
            <span>(assuming they all reaches in time)</span>
          </div>
          <div class="flex flex-row justify-center">
            {#if futurePrediction?.outcome.gift}
              <span class="text-green-600">Will have {futurePrediction?.outcome.min.numSpaceshipsLeft} spaceships</span>
            {:else if futurePrediction?.outcome.min.captured}
              <span class="text-green-600">{futurePrediction?.outcome.min.numSpaceshipsLeft} (captured)</span>
            {:else if futurePrediction?.outcome.nativeResist}
              <span class="text-red-400"
                >{futurePrediction?.outcome.min.numSpaceshipsLeft} (native population resists)</span
              >
            {:else}<span class="text-red-400">{futurePrediction?.outcome.min.numSpaceshipsLeft} (attack failed)</span
              >{/if}
          </div>

          <!-- <div class="flex flex-row justify-center">
            {futureState.accumulatedAttack} VS {futureState.accumulatedDefense} ({futureState.averageAttackPower})
          </div> -->

          <div class="my-2 bg-cyan-300 border-cyan-300 w-full h-1" />
        {/if}

        <label class="flex items-center">
          <input
            type="checkbox"
            class="form-checkbox"
            bind:checked={useAgentService}
            disabled={!agentServiceAccount || agentServiceAccount.requireTopUp || !agentServiceAccount.remoteAccount}
          />

          <span
            class={`ml-2${
              !agentServiceAccount || agentServiceAccount.requireTopUp || !agentServiceAccount.remoteAccount
                ? ' opacity-25'
                : ''
            }`}>submit to agent-service</span
          >
          {#if !agentServiceAccount || agentServiceAccount.requireTopUp || !agentServiceAccount.remoteAccount}
            <span class="ml-2 text-xs"
              >( Enable <a class="underline" href={url('agent-service/')}>Agent-Service</a>
              <Help class="w-4"
                >The agent-service can resolve the second tx for you. You need to register and top it up first though.</Help
              >)</span
            >
          {/if}
        </label>

        <div class="my-2 bg-cyan-300 border-cyan-300 w-full h-1" />
        <div class="text-center">
          <PanelButton
            borderColor={border_color}
            color={text_color}
            cornerColor={border_color}
            class="mt-5"
            label="Fleet Amount"
            disabled={confirmDisabled}
            on:click={() =>
              sendFlow.confirm(
                fleetAmount,
                gift,
                useAgentService,
                fleetOwnerSpecified,
                arrivalTimeWanted
                  ? Math.floor(arrivalTimeWanted.getTime() / 1000)
                  : Math.ceil((spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo) + now()) / 60) * 60,
                false
              )}
          >
            <p>Confirm</p>
            {#if confirmDisabled}
              {#if endOfSessionWarning === 'impossible'}(will not make it){:else}
                (need higher attack)
              {/if}
            {/if}
          </PanelButton>
        </div>

        {#if options['forceSend']}
          <div class="text-center">
            <PanelButton
              borderColor={border_color}
              color={text_color}
              cornerColor={border_color}
              class="mt-5"
              label="Fleet Amount"
              disabled={confirmDisabled}
              on:click={() =>
                sendFlow.confirm(
                  fleetAmount,
                  gift,
                  useAgentService,
                  fleetOwnerSpecified,
                  arrivalTimeWanted
                    ? Math.floor(arrivalTimeWanted.getTime() / 1000)
                    : Math.ceil((spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo) + now()) / 60) * 60,
                  true
                )}
            >
              <p>FORCE</p>
              {#if endOfSessionWarning === 'impossible'}(will not make it){:else}
                (need higher attack)
              {/if}
            </PanelButton>
          </div>
        {/if}
      {/if}
    </div>
  </Modal>
{/if}
