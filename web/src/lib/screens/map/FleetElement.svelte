<script lang="ts">
  import {camera} from '$lib/map/camera';
  import {timeToText} from '$lib/utils';
  import type {Fleet} from '$lib/space/fleets';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {time} from '$lib/time';
  import {planets} from '$lib/space/planets';
  import {playersQuery} from '$lib/space/playersQuery';
  import fleetselection from '$lib/map/fleetselection';
  import {wallet} from '$lib/blockchain/wallet';
  import type {Outcome} from 'conquest-eth-common';
  export let fleet: Fleet;

  $: angle = Math.atan2(
    fleet.to.location.globalY - fleet.from.location.globalY,
    fleet.to.location.globalX - fleet.from.location.globalX
  );
  $: ratio = Math.max(0, (fleet.duration - fleet.timeLeft) / fleet.duration);

  $: distanceSquare =
    Math.pow(fleet.to.location.globalX - fleet.from.location.globalX, 2) +
    Math.pow(fleet.to.location.globalY - fleet.from.location.globalY, 2);

  $: x1 = fleet.from.location.globalX + (distanceSquare > 10 ? Math.cos(angle) * 1.4 : 0);
  $: y1 = fleet.from.location.globalY + (distanceSquare > 10 ? Math.sin(angle) * 1.4 : 0);
  $: x2 = fleet.to.location.globalX - (distanceSquare > 10 ? Math.cos(angle) * 1.4 : 0);
  $: y2 = fleet.to.location.globalY - (distanceSquare > 10 ? Math.sin(angle) * 1.4 : 0);

  $: x = x1 + (x2 - x1) * ratio;
  $: y = y1 + (y2 - y1) * ratio;

  $: scale = $camera ? $camera.renderScale : 1;

  // $: console.log({scale});

  let showLine = true;
  let color;

  let lineColor = 'white';
  $: if (fleet.state === 'SEND_BROADCASTED') {
    color = 'orange';
    showLine = true;
  } else if (fleet.state === 'LOADING') {
    color = '#FFFFFF';
    showLine = true;
  } else if (fleet.state === 'TRAVELING') {
    color = '#00FF00';
    showLine = true;
  } else if (fleet.state === 'READY_TO_RESOLVE') {
    color = '#ff0000';
    showLine = true;
  } else if (fleet.state === 'TOO_LATE_TO_RESOLVE') {
    color = '#ff0000';
    showLine = true;
  } else if (fleet.state === 'RESOLVE_BROADCASTED') {
    color = '#0000ff';
    showLine = false;
  } else if (fleet.state === 'WAITING_ACKNOWLEDGMENT') {
    // fleet is not shown in that case, event take over, see myevents.ts
    color = '#00ff00';
    showLine = false;
  }

  // TODO investigate why there is need to check sendFlow.data.from ? might need to do the same to sendFlow.data.to below
  $: fromPlanetInfo = spaceInfo.getPlanetInfo(fleet.from.location.x, fleet.from.location.y);
  $: fromPlanetState = fromPlanetInfo && planets.planetStateFor(fromPlanetInfo);

  $: toPlanetInfo = spaceInfo.getPlanetInfo(fleet.to.location.x, fleet.to.location.y);
  $: toPlanetState = planets.planetStateFor(toPlanetInfo);

  $: toPlayer = $playersQuery.data?.players[$toPlanetState?.owner];
  $: fromPlayer = $playersQuery.data?.players[fleet.owner];
  $: senderPlayer = $playersQuery.data?.players[fleet.fleetSender || fleet.owner];

  $: minDuration = spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo);

  let prediction:
    | {
        arrivalTime: string;
        numSpaceshipsAtArrival: {max: number; min: number};
        outcome: Outcome;
      }
    | undefined = undefined;
  $: {
    if ($toPlanetState && $fromPlanetState) {
      prediction = {
        arrivalTime: timeToText(fleet.timeLeft),
        numSpaceshipsAtArrival: spaceInfo.numSpaceshipsAtArrival(toPlanetInfo, $toPlanetState, fleet.timeLeft),
        outcome: spaceInfo.outcome(
          fromPlanetInfo,
          toPlanetInfo,
          $toPlanetState,
          fleet.quantity,
          fleet.timeLeft,
          senderPlayer,
          fromPlayer,
          toPlayer,
          fleet.gift,
          fleet.specific
        ),
      };
      lineColor = prediction.outcome.gift ? '#34D399' : 'red';
    } else {
      lineColor = 'white';
    }
  }

  // $: lineColor = prediction?.outcome.gift ? '#34D399' : 'red';

  $: lineDashed = fleet.owner.toLowerCase() !== $wallet.address?.toLowerCase();

  $: renderScale = $camera ? $camera.renderScale : 1;
  let selectionBorder = 4;
  let adjustedRenderScale;
  const multiplier = (toPlanetInfo?.stats.production || 3600) / 3600;
  let blockieScale = 0.025 * multiplier;
  let zoomIn = true;
  $: if (renderScale < 10) {
    adjustedRenderScale = 10 / renderScale;
    blockieScale = 0.025 * multiplier * adjustedRenderScale;
    zoomIn = false;
    selectionBorder = 4;
  } else {
    selectionBorder = 4;
    zoomIn = true;
    blockieScale = 0.025 * multiplier;
    adjustedRenderScale = 1;
  }
</script>

{#if fleet.state === 'READY_TO_RESOLVE'}
  <div
    style={`z-index: 4; position: absolute; transform: translate(${x - 48 / 2}px,${y - 48 / 2}px)  scale(${
      blockieScale * 4
    }, ${blockieScale * 4}); width: ${48}px;
  height: ${48}px;`}
  >
    <div
      style={`
width: ${48}px;
height: ${48}px;
border: ${selectionBorder}px solid red;
border-radius: 50%;
animation-name: event-scale-up-down;
animation-iteration-count: infinite;
animation-duration: 2s;
animation-timing-function: linear;
`}
    />
  </div>
  <!-- <svg
    viewBox="0 0 400 400"
    width={10}
    y={10}
    style={`position: absolute; z-index: 51; overflow: visible; transform: translate(${x - 4}px,${y - 3}px) ;`}
  >
    <path
      id="motionPath"
      fill="none"
      d="
        M 150, 100
        m -75, 0
        a 75,75 0 1,0 150,0
        a 75,75 0 1,0 -150,0
        "
    />

    <path
      id={fleet.txHash}
      style={`transform: rotate(${angle}rad); cursor: pointer; `}
      d="M150 0 L75 200 L225 200 Z"
      fill={color}
    />

    <animateMotion
      xlink:href={'#' + fleet.txHash}
      dur="2s"
      begin="0s"
      fill="freeze"
      repeatCount="indefinite"
      rotate="auto-reverse"
    >
      <mpath xlink:href="#motionPath" />
    </animateMotion>
  </svg> -->
{:else if fleet.state === 'RESOLVE_BROADCASTED'}
  <svg
    viewBox="0 0 500 500 "
    width={(400 / scale) * 6}
    height={(400 / scale) * 6}
    style={`
    position: absolute;
    z-index: 4;
    overflow: visible;
    transform: translate(${x - Math.cos(angle) * 0.2}px,${y - Math.sin(angle) * 0.2}px);
    animation-name: animation-flash;
    animation-iteration-count: infinite;
    animation-delay:0.1s;
    animation-duration: 1s;
    animation-timing-function: linear;
    `}
  >
    <!-- <g style={`transform: scale(${scale});`} > -->
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <path
      style={`transform: rotate(${angle}rad); cursor: pointer; z-index: 99 `}
      d="M -5 -2.5 L 0 0 L -5 2.5 z"
      fill={color}
    />

    <!-- </g> -->
  </svg>
  <svg
    viewBox="0 0 500 500 "
    width={(400 / scale) * 6}
    height={(400 / scale) * 6}
    style={`
    position: absolute;
    z-index: 4;
    overflow: visible;
    transform: translate(${x + Math.cos(angle) * 0.1}px,${y + Math.sin(angle) * 0.1}px);
    animation-name: animation-flash;
    animation-iteration-count: infinite;
    animation-duration: 1s;
    animation-timing-function: linear;
    `}
  >
    <!-- <g style={`transform: scale(${scale});`} > -->
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <path
      style={`transform: rotate(${angle}rad); cursor: pointer; z-index: 99 `}
      d="M -5 -2.5 L 0 0 L -5 2.5 z"
      fill={color}
    />

    <!-- </g> -->
  </svg>
{:else}
  <svg
    viewBox="0 0 500 500 "
    width={(400 / scale) * 6}
    height={(400 / scale) * 6}
    style={`position: absolute; z-index: 4; overflow: visible; transform: translate(${x}px,${y}px);`}
  >
    <!-- <g style={`transform: scale(${scale});`} > -->
    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
    <path
      style={`transform: rotate(${angle}rad); cursor: pointer; z-index: 99 `}
      d="M -5 -2.5 L 0 0 L -5 2.5 z"
      fill={color}
    />

    <!-- </g> -->
  </svg>
{/if}
<!-- TODO zoom -->
{#if ($fleetselection && $fleetselection.txHash == fleet.txHash) || ($camera && $camera.width * $camera.height < 1024)}
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <div
    class="w-32 bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300"
    style={`font-size: 7px;
      transform-origin: top left;
       position: absolute; z-index: 99; overflow: visible; transform: translate(${x}px,${y}px) scale(${2 / scale})`}
  >
    <ul class="text-white">
      <li><span class="text-yellow-300">spaceships:</span> {fleet.quantity}</li>
      <li><span class="text-yellow-300">Time left:</span> {timeToText(fleet.timeLeft)}</li>
      <li>
        <span class="text-yellow-300">Arrival:</span>
        {new Date(
          (fleet.launchTime + Math.max(minDuration, fleet.arrivalTimeWanted - fleet.launchTime)) * 1000
        ).toLocaleString()}
        {#if fleet.arrivalTimeWanted - fleet.launchTime < minDuration}
          <span class="text-yellow-300">Combine at</span> {new Date(fleet.arrivalTimeWanted * 1000).toLocaleString()}
        {/if}
      </li>
      <!-- <li><span class="text-yellow-300">launch+duration:</span> {fleet.launchTime + minDuration}</li>
      <li><span class="text-yellow-300">arrivalTimeWanted:</span> {fleet.arrivalTimeWanted}</li> -->
      {#if prediction}
        <li>
          {#if prediction.outcome.gift}
            <span class="text-green-500">Reinforcement</span>
          {:else if prediction.outcome.min.captured}
            <span class="text-green-500">Will capture </span>
          {:else}
            <span class="text-red-500">Fails to capture</span>
          {/if}
        </li>

        {#if prediction.outcome.gift}
          <li>
            <span class="text-green-500">spaceships then: {prediction.outcome.min.numSpaceshipsLeft}</span>
          </li>
        {:else if prediction.outcome.min.captured}
          <li>
            <span class="text-green-500">spaceships then: {prediction.outcome.min.numSpaceshipsLeft}</span>
          </li>
        {:else}
          <li>
            <span class="text-red-500">defender's loss: {prediction.outcome.combat?.defenderLoss}</span>
          </li>
          <!-- <li>
            <span class="text-red-500">attackerLoss: {prediction.outcome.combat?.attackerLoss}</span>
          </li> -->
          <li>
            <span class="text-red-500">spaceships left: {prediction.outcome.min.numSpaceshipsLeft}</span>
          </li>
        {/if}
      {/if}
    </ul>
  </div>
{/if}

{#if showLine}
  <svg style={`position: absolute; z-index: 3; overflow: visible;`}>
    <marker
      xmlns="http://www.w3.org/2000/svg"
      id="triangle"
      viewBox="0 0 10 10"
      refX="10"
      refY="5"
      fill="#FFFFFF"
      stroke="#34D399"
      markerUnits="strokeWidth"
      markerWidth="4"
      markerHeight="3"
      orient="auto"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
    <line
      marker-end="url(#triangle)"
      style="z-index: 3;"
      stroke-width={`${4 / scale}px`}
      stroke={lineColor}
      stroke-dasharray={lineDashed ? '1' : undefined}
      {x1}
      {y1}
      {x2}
      {y2}
    />
  </svg>
{/if}
