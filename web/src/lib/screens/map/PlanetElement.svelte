<script lang="ts">
  export let planetInfo: PlanetInfo;

  import planetsFrame from '../../../assets/planets.json';
  import planetsImageURL from '../../../assets/planets.png';
  import type {PlanetInfo} from 'conquest-eth-common';
  import SharedBlockie from './SharedBlockie.svelte';
  import {camera} from '$lib/map/camera';
  import {planets} from '$lib/space/planets';
  import {base} from '$app/paths';
  import {wallet} from '$lib/blockchain/wallet';
  import selection from '$lib/map/selection';
  import selectionOwner from '$lib/map/selectionOwner';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {hasCommonAlliance, playersQuery} from '$lib/space/playersQuery';
  import {privateWallet} from '$lib/account/privateWallet';
  import {matchConditions, pluginShowing, showPlanetButtons} from '$lib/plugins/currentPlugin';
  import {overlays} from '$lib/map/overlays';
  import sendFlow from '$lib/flows/send';
  import claimFlow from '$lib/flows/claim';
  import {time} from '$lib/time';
  import {yakuzaQuery} from '$lib/default-plugins/yakuza/yakuzaQuery';

  type Frame = {x: number; y: number; w: number; h: number};

  const planetTypesToFrame = [
    'Baren.png',
    'Baren.png',
    'Tech_2.png',
    'Baren.png',
    'Barren_2.png',
    'Tech_2.png',
    'Jungle48.png',
    'Jungle48.png',
    'Tundra.png',
    'Baren.png',
    'Desert.png',
    'Tech_2.png',
    'Barren_2.png',
    'Ocean_1.png',
    'Desert_2.png',
    'Jungle48.png',
    'Forest.png',
    'Terran_1.png',
    'Ice.png',
    'Ice.png',
    'Gas_1.png',
    'Ice.png',
    'Lava_1.png',
    'Terran_2.png',
    'Tech_1.png',
    'Ocean.png',
    'Terran.png',
  ];

  const planetState = planets.planetStateFor(planetInfo);

  let frameType: string;
  if (!frameType) {
    frameType = planetTypesToFrame[planetInfo.type % planetTypesToFrame.length];
    if (!frameType) {
      throw new Error(`no frame type for ${planetInfo.type}`);
    }
  }
  let frameInfo = (planetsFrame.frames as any)[frameType] as {frame: Frame};
  let frame = frameInfo.frame;
  const multiplier = planetInfo.stats.production / 3600;
  let scale = 0.025 * multiplier;
  let x = planetInfo.location.globalX - frame.w / 2;
  let y = planetInfo.location.globalY - frame.h / 2;

  $: owner = $planetState?.owner;

  $: active = $planetState?.active;

  let rewardAttached = false;
  $: if ($planetState && $planetState?.rewardGiver !== '' && $planetState?.rewardGiver !== '0') {
    // console.log({rewardGiver: $planetState.rewardGiver});
    if ($planetState?.rewardGiver === '0xdddddddddddddddddddddddddddddddddddddddd') {
      frameType = 'Xaya_sun.png';
    } else if ($planetState?.rewardGiver === '0x1111111111111111111111111111111111111111') {
      frameType = 'Pokt_sun.png';
    } else if ($planetState?.rewardGiver === '0x2222222222222222222222222222222222222222') {
      frameType = 'Gnosis_sun.png';
    } else if ($planetState?.rewardGiver === '0x3333333333333333333333333333333333333333') {
      frameType = 'Soccerverse_sun.png';
    } else if ($planetState?.rewardGiver === '0x4444444444444444444444444444444444444444') {
      frameType = 'Blockscout_sun.png';
    } else if ($planetState?.rewardGiver === '0x5555555555555555555555555555555555555555') {
      frameType = 'cafecosmos_planet.png';
    } else if ($planetState?.rewardGiver === '0x6666666666666666666666666666666666666666') {
      frameType = 'gg_sun_gray.png';
    } else if ($planetState?.rewardGiver === '0x7777777777777777777777777777777777777777') {
      frameType = 'InfiniteSeas_sun.png';
    } else if ($planetState?.rewardGiver === `0x8888888888888888888888888888888888888888`) {
      frameType = 'mithril_sun.png';
    }

    frameInfo = (planetsFrame.frames as any)[frameType] as {frame: Frame};
    frame = frameInfo.frame;
    scale = 0.025 * multiplier;
    x = planetInfo.location.globalX - frame.w / 2;
    y = planetInfo.location.globalY - frame.h / 2;
    rewardAttached = true; // TODO again
  } else {
    // TODO remove duplication above
    frameType = planetTypesToFrame[planetInfo.type % planetTypesToFrame.length];
    frameInfo = (planetsFrame.frames as any)[frameType] as {frame: Frame};
    frame = frameInfo.frame;
    scale = 0.025 * multiplier;
    x = planetInfo.location.globalX - frame.w / 2;
    y = planetInfo.location.globalY - frame.h / 2;
    rewardAttached = false;
  }

  const alliancesOffset = [-1, 1, 1, -1];

  $: ownerObject = $playersQuery.data?.players[owner];
  $: alliances = ownerObject ? ownerObject.alliances : [];

  // DEBUG one alliance
  // $: alliances = ownerObject
  //   ? ownerObject.alliances.length > 0
  //     ? ownerObject.alliances.concat(ownerObject.alliances[0], ownerObject.alliances[0], ownerObject.alliances[0])
  //     : []
  //   : [];

  // if (x > -20 * 4 && x < 20 * 4 && y > -20 * 4 && y < 20 * 4) {
  //   owner = '0x3333333333333333333333333333333333333333';
  // }

  $: renderScale = $camera ? $camera.renderScale : 1;

  let selectionBorder = 4;
  let adjustedRenderScale = 1;
  let blockieScale = scale;
  let unMultipliedBlockieScale = 0.025;
  let zoomIn = true;
  $: if (owner && renderScale < 10) {
    adjustedRenderScale = 10 / renderScale;
    blockieScale = scale * adjustedRenderScale;
    unMultipliedBlockieScale = 0.025 * adjustedRenderScale;
    zoomIn = false;
    selectionBorder = 4;
  } else {
    selectionBorder = 4;
    zoomIn = true;
    blockieScale = scale;
    unMultipliedBlockieScale = 0.025;
    adjustedRenderScale = 1;
  }

  $: if (renderScale < 10) {
    unMultipliedBlockieScale = 0.025 * (10 / renderScale);
  } else {
    unMultipliedBlockieScale = 0.025;
  }

  $: playerIsOwner = $privateWallet.step === 'READY' && owner?.toLowerCase() === $wallet.address?.toLowerCase();

  $: isSelectedOwner = $selectionOwner && $selectionOwner.address.toLowerCase() === owner?.toLowerCase();

  // $: capacityReached = $planetState
  //   ? spaceInfo.productionCapAsDuration &&
  //     spaceInfo.productionCapAsDuration > 0 &&
  //     $planetState.numSpaceships >=
  //       spaceInfo.acquireNumSpaceships +
  //         Math.floor(planetInfo.stats.production * spaceInfo.productionCapAsDuration) / (60 * 60)
  //   : false;

  $: capacityRatio = $planetState
    ? spaceInfo.productionCapAsDuration &&
      spaceInfo.productionCapAsDuration > 0 &&
      Math.max(
        0.6,
        Math.min(
          1,
          $planetState.numSpaceships /
            (spaceInfo.acquireNumSpaceships +
              Math.floor(planetInfo.stats.production * spaceInfo.productionCapAsDuration) / (60 * 60))
        )
      )
    : 0;

  $: isAlly = alliances.find((v) => v.ally);
  $: borderColor =
    !$wallet.address || $privateWallet.step !== 'READY'
      ? isSelectedOwner
        ? 'red'
        : hasCommonAlliance($selectionOwner, $playersQuery.data?.players[owner?.toLowerCase()])
        ? `rgba(255, 165 ,0, 1)`
        : 'white'
      : playerIsOwner
      ? `rgba(0, 255, 0, ${capacityRatio})`
      : isAlly
      ? isSelectedOwner
        ? `rgba(103, 232, 255, ${capacityRatio})`
        : `rgba(103, 232, 255, ${capacityRatio})` // TODO different color on selection ?
      : isSelectedOwner
      ? `rgba(255, 0 ,0, ${capacityRatio})`
      : hasCommonAlliance($selectionOwner, $playersQuery.data?.players[owner?.toLowerCase()])
      ? `rgba(255, 165 ,0, ${capacityRatio})`
      : $selectionOwner
      ? `rgba(255, 255 ,255, ${capacityRatio})`
      : `rgba(255, 0 ,0, ${capacityRatio})`;

  $: allianceBorderColor =
    !$wallet.address || $privateWallet.step !== 'READY'
      ? isSelectedOwner
        ? 'red'
        : hasCommonAlliance($selectionOwner, $playersQuery.data?.players[owner?.toLowerCase()])
        ? `red`
        : 'white'
      : playerIsOwner
      ? `lime`
      : isAlly
      ? isSelectedOwner
        ? `lime`
        : `lime` // TODO different color on selection ?
      : isSelectedOwner
      ? `red`
      : hasCommonAlliance($selectionOwner, $playersQuery.data?.players[owner?.toLowerCase()])
      ? `red`
      : $selectionOwner
      ? `white`
      : `red`;

  // $: borderColorWithoutTransparency =
  //   !$wallet.address || $privateWallet.step !== 'READY'
  //   ? isSelectedOwner
  //     ? 'red'
  //     : hasCommonAlliance($selectionOwner, $playersQuery.data?.players[owner?.toLowerCase()])
  //     ? `rgb(255, 165 ,0)`
  //     : 'white'
  //   : playerIsOwner
  //   ? `rgb(0, 255, 0)`
  //   : isAlly
  //   ? isSelectedOwner
  //     ? `rgb(103, 232, 255)`
  //     : `rgb(103, 232, 255)` // TODO different color on selection ?
  //   : isSelectedOwner
  //   ? `rgb(255, 0 ,0)`
  //   : hasCommonAlliance($selectionOwner, $playersQuery.data?.players[owner?.toLowerCase()])
  //   ? `rgb(255, 165 ,0)`
  //   : $selectionOwner
  //   ? `rgb(255, 255 ,255)`
  //   : `rgb(255, 0 ,0)`;

  $: plugins = !$planetState
    ? []
    : $showPlanetButtons.filter(
        (v) =>
          v.mapConditions &&
          matchConditions(v.mapConditions, {account: $wallet.address, planetState: $planetState, planetInfo})
      );

  $: yakuzaClaim =
    $yakuzaQuery.data?.state &&
    ($yakuzaQuery.data.state.fleets.find((v) => v.to === planetInfo.location.id) ||
      $yakuzaQuery.data.state.yakuzaPlanets.find((v) => v.id === planetInfo.location.id));

  $: isYakuzaSubscriber = $planetState && $planetState.ownerYakuzaSubscriptionEndTime > $time;

  $: pickedBySendFlow =
    ($sendFlow.step === 'PICK_DESTINATION' &&
      $sendFlow.data.from.x == planetInfo.location.x &&
      $sendFlow.data.from.y == planetInfo.location.y) ||
    ($sendFlow.step === 'PICK_ORIGIN' &&
      $sendFlow.data.to.x == planetInfo.location.x &&
      $sendFlow.data.to.y == planetInfo.location.y);

  $: pickedByClaimFlow =
    $claimFlow.step === 'ADD_MORE' &&
    $claimFlow.data.coords.find((v) => v.x == planetInfo.location.x && v.y == planetInfo.location.y);

  $: showOwner =
    $overlays.planetOwners !== 'None' &&
    ($overlays.planetOwners === 'Everyone' ||
      ($overlays.planetOwners === 'OnlyYou' && playerIsOwner) ||
      ($overlays.planetOwners === 'OnlyAllies' && (isAlly || playerIsOwner)));
</script>

<div>
  {#if rewardAttached}
    <div
      style={`position: absolute; transform: translate(${x}px,${y}px) scale(${unMultipliedBlockieScale * 2}, ${
        unMultipliedBlockieScale * 2
      }); background: url(${base}${planetsImageURL}); background-position: ${-frame.x}px ${-frame.y}px; width: ${
        frame.w
      }px; height: ${frame.h}px;
`}
      data={`${planetInfo.location.x}, ${planetInfo.location.y} : ${planetInfo.stats.subX}, ${planetInfo.stats.subY} -| ${planetInfo.location.globalX}, ${planetInfo.location.globalY}`}
    />
  {:else if zoomIn || !showOwner}
    <!-- {#if zoomIn} -->
    <div
      style={`position: absolute; transform: translate(${x}px,${y}px) scale(${scale}, ${scale}); background: url(${base}${planetsImageURL}); background-position: ${-frame.x}px ${-frame.y}px; width: ${
        frame.w
      }px; height: ${frame.h}px;
  `}
      data={`${planetInfo.location.x}, ${planetInfo.location.y} : ${planetInfo.stats.subX}, ${planetInfo.stats.subY} -| ${planetInfo.location.globalX}, ${planetInfo.location.globalY}`}
    />
  {/if}

  {#if rewardAttached}
    <div
      style={`
        z-index: 2;
        position: absolute;
        transform: translate(${x}px,${y}px) scale(${unMultipliedBlockieScale * 5}, ${unMultipliedBlockieScale * 5});
        width: ${frame.w}px;
        height: ${frame.h}px;
      `}
    >
      <div
        style={`
        width: ${frame.w}px;
        height: ${frame.h}px;
        border: ${selectionBorder}px dashed #FFD70066;
      `}
      />
    </div>
  {/if}

  {#if pickedByClaimFlow}
    <div
      style={`
    z-index: 3;
    position: absolute;
    transform: translate(${x}px,${y}px) scale(${(blockieScale * 3) / multiplier}, ${(blockieScale * 3) / multiplier});
    width: ${frame.w}px;
    height: ${frame.h}px;
  `}
    >
      <div
        style={`
          width: ${frame.w}px;
          height: ${frame.h}px;
          border: ${selectionBorder / 1.2}px solid green;
          border-radius: 50%;
          animation-name: event-scale-up-down;
          animation-iteration-count: infinite;
          animation-duration: 2s;
          animation-timing-function: linear;
        `}
      />
    </div>
  {:else if pickedBySendFlow}
    <div
      style={`
    z-index: 3;
    position: absolute;
    transform: translate(${x}px,${y}px) scale(${(blockieScale * 3) / multiplier}, ${(blockieScale * 3) / multiplier});
    width: ${frame.w}px;
    height: ${frame.h}px;
  `}
    >
      <div
        style={`
          width: ${frame.w}px;
          height: ${frame.h}px;
          border: ${selectionBorder / 1.2}px solid white;
          border-radius: 50%;
          animation-name: event-scale-up-down;
          animation-iteration-count: infinite;
          animation-duration: 2s;
          animation-timing-function: linear;
        `}
      />
    </div>
  {:else if $selection && $selection.x === planetInfo.location.x && $selection.y === planetInfo.location.y}
    <div
      style={`
        z-index: 3;
        position: absolute;
        transform: translate(${x}px,${y}px) scale(${(blockieScale * 3) / multiplier}, ${
        (blockieScale * 3) / multiplier
      });
        width: ${frame.w}px;
        height: ${frame.h}px;
      `}
    >
      <div
        style={`
          width: ${frame.w}px;
          height: ${frame.h}px;
          border: ${selectionBorder / 1.2}px solid white;
          animation-name: event-scale-up-down;
          animation-iteration-count: infinite;
          animation-duration: 2s;
          animation-timing-function: linear;
        `}
      />
    </div>
  {/if}

  {#if $planetState && $planetState.capturing}
    <div
      style={`
    z-index: 3;
    position: absolute;
    transform: translate(${x}px,${y}px) scale(${blockieScale * 3}, ${blockieScale * 3});
    width: ${frame.w}px;
    height: ${frame.h}px;
  `}
    >
      <div
        style={`
      width: ${frame.w}px;
      height: ${frame.h}px;
      border: ${selectionBorder}px solid white;
      border-left-color: red;
      border-radius: 50%;
      animation-name: rotate-s-loader;
      animation-iteration-count: infinite;
      animation-duration: 1s;
      animation-timing-function: linear;
    `}
      />
    </div>
  {/if}

  {#if $planetState && $planetState.exiting && typeof $planetState.exitTimeLeft === 'number'}
    <div
      style={`
        z-index: 5;
        position: absolute;
        transform: translate(${x}px,${y}px) scale(${blockieScale * 3}, ${blockieScale * 3});
        width: ${frame.w}px;
        height: ${frame.h}px;
      `}
    >
      <svg viewBox="0 0 36 36">
        <path
          style="fill: none; stroke-width: 2.8; stroke-linecap: round; stroke: #ff3300;"
          stroke-dasharray={`${Math.max(
            ((spaceInfo.exitDuration - $planetState.exitTimeLeft) / spaceInfo.exitDuration) * 100,
            3
          )} 100`}
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
    </div>
  {/if}

  {#if $planetState && !$planetState.exiting && $planetState.flagTime > 0 && $time < $planetState.flagTime + (6 * 24 * 3600) / spaceInfo.productionSpeedUp}
    <div
      style={`
    z-index: 5;
    position: absolute;
    transform: translate(${x}px,${y}px) scale(${blockieScale * 2}, ${blockieScale * 2});
    width: ${frame.w}px;
    height: ${frame.h}px;
  `}
    >
      <svg viewBox="0 0 36 36">
        <path
          style="fill: none; stroke-width: 2.24; stroke-linecap: round; stroke: #86efac;"
          stroke-dasharray={`${Math.min(
            Math.max(
              (($planetState.flagTime + (6 * 24 * 3600) / spaceInfo.productionSpeedUp - $time) /
                ((6 * 24 * 3600) / spaceInfo.productionSpeedUp)) *
                100,
              3
            ),
            95
          )} 95`}
          d="M18 4.5014
        a 12.7324 12.7324 0 0 1 0 25.4648
        a 12.7324 12.7324 0 0 1 0 -25.4648"
        />
      </svg>
    </div>
  {/if}

  {#each plugins as plugin}
    <!-- TODO color -->
    <div
      style={`
        z-index: 5;
        position: absolute;
        transform: translate(${x}px,${y}px) scale(${blockieScale * 2}, ${blockieScale * 2});
        width: ${frame.w}px;
        height: ${frame.h}px;
      `}
    >
      <svg viewBox="0 0 36 36">
        <path
          style="fill: none; stroke-width: 2.8; stroke-linecap: round; stroke: blue;"
          stroke-dasharray={`100 100`}
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
    </div>
  {/each}

  {#if yakuzaClaim}
    <div
      style={`
    z-index: 5;
    position: absolute;
    transform: translate(${x}px,${y}px) scale(${blockieScale * 2.5}, ${blockieScale * 2.5});
    width: ${frame.w}px;
    height: ${frame.h}px;
  `}
    >
      <svg viewBox="0 0 36 36">
        <path
          style="fill: none; stroke-width: 2; stroke-linecap: round; stroke: #FB48C4;"
          d="M18 2.0845
          a 15.9155 15.9155 0 0 1 0 31.831
          a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
    </div>
  {/if}

  {#if showOwner && owner}
    {#if blockieScale <= scale}
      <div>
        <SharedBlockie
          style={`
          pointer-events: none;
          z-index: 2;
          position: absolute;
          transform:
            translate(${
              rewardAttached ? x + 1.2 * multiplier - +0.5 / scale / 2 : x + 0.6 * multiplier - +0.5 / scale / 2
            }px,${rewardAttached ? y - 1.8 * multiplier - +0.5 / scale / 2 : y - 1.2 * multiplier - +0.5 / scale / 2}px)
            scale(${blockieScale}, ${blockieScale});
          width: ${frame.w + 0.5 / scale}px; height: ${frame.h + 0.5 / scale}px;
          border: ${active ? 'solid ' + 0.25 / scale + 'px' : 'dashed ' + 0.12 / scale + 'px'}  ${borderColor};
          ${
            isYakuzaSubscriber && !playerIsOwner
              ? `outline: ${active ? 'solid ' + 0.25 / scale + 'px' : 'dashed ' + 0.12 / scale + 'px'}  #FB48C4;`
              : ''
          }
        `}
          address={owner}
        />
      </div>
    {:else}
      <SharedBlockie
        style={`
          pointer-events: none;
          z-index: 2;
          position: absolute;
          transform:
            translate(${x + 0 * multiplier}px,${y - 0 * multiplier}px)
            scale(${blockieScale * 1.5}, ${blockieScale * 1.5});
          width: ${frame.w}px; height: ${frame.h}px;
          border: ${active ? 'solid ' + 0.25 / scale + 'px' : 'dashed ' + 0.12 / scale + 'px'}  ${borderColor};
       `}
        address={owner}
      />
    {/if}
  {/if}

  {#if $overlays.alliances}
    {#each alliances as alliance, i}
      {#if blockieScale <= scale}
        <SharedBlockie
          offset={1}
          style={`
        pointer-events: none;
        z-index: 3;
        position: absolute;
        transform:
          translate(${x + 0.6 * multiplier - +0.5 / scale / 2 + alliancesOffset[i % 4] * 1.3 * multiplier}px,${
            y - 0.6 * multiplier - +0.5 / scale / 2 + alliancesOffset[(i + 3) % 4] * 1.3 * multiplier
          }px)
          scale(${blockieScale}, ${blockieScale});
        width: ${frame.w + 0.5 / scale}px; height: ${frame.h + 0.5 / scale}px;
        border: solid 10px ${allianceBorderColor};
        border-radius: ${frame.w}px;
`}
          address={alliance.address}
        />
      {:else}
        <SharedBlockie
          offset={1}
          style={`
        pointer-events: none;
        z-index: 3;
        position: absolute;
        transform:
          translate(${x + alliancesOffset[i % 4] * 1.3 * multiplier}px,${
            y + alliancesOffset[(i + 3) % 4] * 1.3 * multiplier
          }px)
          scale(${blockieScale * 1.5}, ${blockieScale * 1.5});
        width: ${frame.w}px; height: ${frame.h}px;
        border: solid 10px ${allianceBorderColor};
        border-radius: ${frame.w}px;
`}
          address={alliance.address}
        />
      {/if}
    {/each}
  {/if}
</div>
