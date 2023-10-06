<script lang="ts">
  import {spaceView} from '$lib/space/spaceInfo';
  import PlanetElement from './PlanetElement.svelte';
  import {camera} from '$lib/map/camera';
  import spaceBackground from '../../../assets/Red3.png';
  import {base} from '$app/paths';
  import {fleetList} from '$lib/space/fleets';
  import FleetElement from './FleetElement.svelte';
  import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';
  import {myevents} from '$lib/space/myevents';
  import EventElement from './EventElement.svelte';
  import {errors} from '$lib/space/errors';
  import ErrorElement from './ErrorElement.svelte';
  import {overlays} from '$lib/map/overlays';
  import sendFlow, {virtualFleetFrom, virtualFleetTo} from '$lib/flows/send';
  import selection from '$lib/map/selection';
  import VirtualFleetElement from './VirtualFleetElement.svelte';
  import simulateFlow, {virtualFleetSimulationTo} from '$lib/flows/simulateFlow';
  import VirtualFleetSimulationElement from './VirtualFleetSimulationElement.svelte';

  $: renderScale = $camera ? $camera.renderScale : 1;
  $: renderX = $camera?.renderX || 0;
  $: renderY = $camera?.renderY || 0;

  $: gridTickness = Math.min(0.4, 1 / renderScale);

  $: remGridTickness = Math.min(0.04, 1 / renderScale);

  $: sectorGridColor = `rgb(0,255,255,${Math.min(2 / renderScale, 0.4)})`;

  $: x1 = ($spaceQueryWithPendingActions.queryState.data?.space?.x1 || 0) * 4 - 2; // TODO sync CONSTANTS with thegraph and contract
  $: x2 = ($spaceQueryWithPendingActions.queryState.data?.space?.x2 || 0) * 4 + 2;
  $: y1 = ($spaceQueryWithPendingActions.queryState.data?.space?.y1 || 0) * 4 - 2;
  $: y2 = ($spaceQueryWithPendingActions.queryState.data?.space?.y2 || 0) * 4 + 2;

  let sectorsInView = [];
  $: {
    sectorsInView = [];
    if ($camera) {
      // console.log({x: $camera.x, y: $camera.y});
      // console.log({width: $camera.width, height: $camera.height, zoom: $camera.zoom});
      // console.log({rx: $camera.renderX, ry: $camera.renderY});
      // console.log({rw: $camera.renderWidth, rh: $camera.renderHeight, rScale: $camera.renderScale});
      const cx1 = $camera.x - $camera.width / 2;
      const cx2 = $camera.x + $camera.width / 2;
      const cy1 = $camera.y - $camera.height / 2;
      const cy2 = $camera.y + $camera.height / 2;
      // console.log({cx1, cx2, cy1, cy2});
      for (let x = cx1; x < cx2 + 60; x += 60) {
        for (let y = cy1; y < cy2 + 60; y += 60) {
          // sectorsInView.push(`${Math.floor((x + 32) / 64) * 64},${Math.floor((y + 32) / 64) * 64} `);
          const sectorX = Math.floor((x + 30) / 60) * 60;
          const sectorY = Math.floor((y + 30) / 60) * 60;
          sectorsInView.push({
            x: sectorX,
            y: sectorY,
            id: `${sectorX / 60},${sectorY / 60}`,
          });
        }
      }
      // console.log(sectorsInView);
    }
  }
</script>

<!-- experiments -->
<!-- <div
  style={`
    /*pointer-events: none;*/
    position: absolute;
    width:100%; height: 100%;
    top: 0px;
    left: 0px;

    /*
    background-image: linear-gradient(blue 1px, transparent 0px),linear-gradient(to right, blue 1px, transparent 0px);
    */
    /*
    background-image: linear-gradient(blue 1px, transparent 0px);
    */

    /*background-image: linear-gradient(90deg, blue 0.51px, black 0.51px, black 100%);*/

    background-image: repeating-linear-gradient(to right, blue 0 0.8px, transparent 0 60px),
    repeating-linear-gradient(to bottom, blue 0 0.8px, transparent 0 60px);


    transform: scale(${renderScale},${renderScale});
    background-size: 60px 60px;
    background-position: ${renderX - 30.4}px ${renderY - 30.8}px;



    /*
    background-size: ${60 * renderScale}px ${60 * renderScale}px;
    background-position: ${(renderX - 30) * renderScale}px ${(renderY - 30) * renderScale}px;
    */
    `}
/> -->

{#if $overlays.sectors}
  <!--
  SECTOR GRID
  that works in both chrome and firefox but does not render well on firefox
  but is quite thick (to make it work on firefox)
-->
  <div
    style={`
    /*pointer-events: none;*/
    position: absolute;
    width:100%; height: 100%;

    background-image: repeating-linear-gradient(to right, ${sectorGridColor} 0 0.8px, transparent 0 60px),
    repeating-linear-gradient(to bottom, ${sectorGridColor} 0 0.8px, transparent 0 60px);

    transform: scale(${renderScale},${renderScale});
    background-size: 60px 60px;
    background-position: ${renderX - 30.4}px ${renderY - 30.8}px;
    `}
  />
{/if}

<!-- new grid , does not work in firefox-->
<!-- <div
  style={`
/*pointer-events: none;*/
position: absolute;
width:100%; height: 100%;
transform: scale(${renderScale},${renderScale});
    background-size: 4px 4px;
    background-position: ${renderX - 2}px ${renderY - 2}px;
background-image: repeating-linear-gradient(to right, grey 0 0.1px, transparent 0 4px),
repeating-linear-gradient(to bottom, grey 0 0.1px, transparent 0 4px);

`}
/> -->

<div
  style={`
  /* pointer-events: none; */
position: absolute;
transform: scale(${renderScale},${renderScale});
width:100%; height: 100%;
`}
>
  {#if $camera && $camera.zoom >= 10}
    <!-- OLD GRID WITH DOTS-->
    <div
      style={`
    /*pointer-events: none;*/
    position: absolute;
    width:100%; height: 100%;
    background-size: 4px 4px;
    background-image: radial-gradient(circle, #CCCCCC ${gridTickness}px, rgba(0.8, 0.8, 0.8, 0) ${gridTickness}px);
    background-position: ${$camera ? $camera.renderX : 0}px ${$camera ? $camera.renderY : 0}px;
    `}
    />

    <!-- new grid -->
    <!-- <div
      style={`
    /*pointer-events: none;*/
    position: absolute;
    width:100%; height: 100%;
    background-size: 4px 4px;
    /*background-image: linear-gradient(to right, grey ${gridTickness}px, transparent ${gridTickness}px),
    linear-gradient(to bottom, grey ${gridTickness}px, transparent ${gridTickness}px);*/
    background-image: linear-gradient(grey 0.4px, transparent 0.4px),linear-gradient(90deg, grey 0.4px, transparent 0.4px);
    background-position: ${$camera ? $camera.renderX - 2 : -2}px ${$camera ? $camera.renderY - 2 : -2}px;
    `}
    /> -->

    <!-- <div
      style={`
  /*pointer-events: none;*/
  position: absolute;
  width:100%; height: 100%;
  background-image: repeating-linear-gradient(to right, grey 0 0.1px, transparent 0 4px),
    repeating-linear-gradient(to bottom, grey 0 0.1px, transparent 0 4px);
  background-position: ${$camera ? $camera.renderX - 2 : -2}px ${$camera ? $camera.renderY - 2 : -2}px;
  `}
    /> -->
  {/if}

  <!-- SECTOR GRID -->
  <!-- <div
    style={`
    /*pointer-events: none;*/
    position: absolute;
    width:100%; height: 100%;
    background-size: 60px 60px;
    /*background-image: linear-gradient(blue ${remGridTickness}rem, transparent ${remGridTickness}rem),
    linear-gradient(90deg, blue ${remGridTickness}rem, transparent ${remGridTickness}rem);*/
    background-image: linear-gradient(blue 1px, transparent 1px),linear-gradient(90deg, blue 1px, transparent 1px);
    /*background-image:  linear-gradient(white .4rem, transparent .4rem), linear-gradient(90deg, white .4rem, transparent .4rem);*/
    background-position: ${$camera ? $camera.renderX - 30 : -30}px ${$camera ? $camera.renderY - 30 : -30}px;
    `}
  /> -->

  <div
    style={`
    /*pointer-events: none;*/
    position: absolute;
    transform:
    translate(${$camera ? $camera.renderX : 1}px,${$camera ? $camera.renderY : 1}px);
    width:100%; height: 100%;
    `}
  >
    {#if $spaceView}
      {#each $spaceView as planetInfo (planetInfo.location.id)}
        <PlanetElement {planetInfo} />
      {/each}
    {/if}

    {#if $overlays.fleets}
      {#if $fleetList.fleets}
        {#each $fleetList.fleets as fleet}
          {#if fleet.state !== 'WAITING_ACKNOWLEDGMENT'}
            <FleetElement {fleet} />
          {/if}
        {/each}
      {/if}
    {/if}

    {#if $selection && $sendFlow}
      {#if $sendFlow.step === 'PICK_ORIGIN'}
        <VirtualFleetElement fleet={virtualFleetFrom($sendFlow.data, $selection)} />
      {:else if $sendFlow.step === 'PICK_DESTINATION'}
        <VirtualFleetElement fleet={virtualFleetTo($sendFlow.data, $selection)} />
      {:else if $simulateFlow.step === 'PICK_DESTINATION'}
        <VirtualFleetSimulationElement fleet={virtualFleetSimulationTo($simulateFlow.data, $selection)} />
      {/if}
    {/if}

    {#if $overlays.sectors}
      {#each sectorsInView as sector (sector.id)}
        <div
          style={`background-color: black; z-index: 50; position: absolute; transform: translate(${sector.x - 30}px,${
            sector.y - 30
          }px);`}
        >
          <div style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.4px;">
            <p
              style={`margin-left: ${5 / renderScale}px; color: cyan; font-weight: 900; font-size: ${
                13 / renderScale
              }px`}
            >
              S({sector.id})
            </p>
          </div>
        </div>
      {/each}
    {/if}

    {#if $myevents}
      {#each $myevents as event}
        {#if event.acknowledged === 'NO'}
          <EventElement {event} />
        {/if}
      {/each}
    {/if}

    {#if $errors}
      {#each $errors as error}
        {#if !error.acknowledged && error.location}
          <ErrorElement {error} />
        {/if}
      {/each}
    {/if}

    <!-- <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <rect x={x1-500} y={y2} width={1000} height={1000} fill="black" fill-opacity="0.5"/>
    </svg>
    <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <rect x={x1-500} y={y1-1000} width={1000} height={1000} fill="black" fill-opacity="0.5"/>
    </svg>
    <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <rect x={x2} y={y1} width={1000} height={y2-y1} fill="black" fill-opacity="0.5"/>
    </svg>
    <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <rect x={x1-1000} y={y1} width={1000} height={y2-y1} fill="black" fill-opacity="0.5"/>
    </svg> -->

    {#if $spaceQueryWithPendingActions.queryState.data?.space}
      <svg style={`pointer-events: none; position: absolute; z-index: 50; overflow: visible;`}>
        <defs>
          <clipPath id="space">
            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} />
          </clipPath>
          <mask id="myMask">
            <rect x={x1 - 1000000} y={y1 - 1000000} width={x2 - x1 + 2000000} height={y2 - y1 + 2000000} fill="white" />
            <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="black" />
          </mask>
        </defs>

        <!-- <rect x={x1-1000} y={y1-1000} width={(x2-x1) + 2000} height={(y2-y1) + 2000} fill="black" fill-opacity="0.6" clip-path="url(#space)" /> -->
        <rect
          x={x1 - 1000000}
          y={y1 - 1000000}
          width={x2 - x1 + 2000000}
          height={y2 - y1 + 2000000}
          fill="black"
          fill-opacity="0.4"
          mask="url(#myMask)"
        />
      </svg>

      <svg style={`pointer-events: none; position: absolute; z-index: 50; overflow: visible;`}>
        <rect
          x={x1}
          y={y1}
          width={x2 - x1}
          height={y2 - y1}
          stroke="white"
          stroke-opacity="0.5"
          fill="none"
          stroke-dasharray="2 10"
        />
      </svg>
    {/if}
    <!-- <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <line stroke-width="1px" stroke="blue"  x1={x1} y1={y1} x2={x2} y2={y1}/>
    </svg>
    <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <line stroke-width="1px" stroke="blue"  x1={x2} y1={y1} x2={x2} y2={y2}/>
    </svg>
    <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <line stroke-width="1px" stroke="blue"  x1={x2} y1={y2} x2={x1} y2={y2}/>
    </svg>
    <svg style={`position: absolute; z-index: 50; overflow: visible;`}>
      <line stroke-width="1px" stroke="blue"  x1={x1} y1={y2} x2={x1} y2={y1}/>
    </svg> -->
  </div>

  <div
    style={`
    pointer-events: none;
  position: absolute;
  width:150%; height: 150%;
  top: -25%;
  left: -25%;
  opacity: ${$camera ? Math.max(0.2, Math.min(0.4, 1 - $camera.renderScale / 10)) : 0};
  background-image: url(${base}${spaceBackground});
  background-position: ${($camera ? $camera.renderX * 1.5 : 0) - 2}px ${($camera ? $camera.renderY * 1.5 : 0) - 2}px;
  `}
  />
</div>

<style>
  @keyframes -global-rotate-s-loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes -global-event-scale-up-flat {
    from {
      transform: scale(0.8);
    }
    to {
      transform: scale(2);
    }
  }

  @keyframes -global-event-scale-up-down {
    0%,
    50%,
    100% {
      transform: scale(1.8);
    }
    25%,
    75% {
      transform: scale(1);
    }
  }

  @keyframes -global-animation-flash {
    0%,
    50%,
    100% {
      opacity: 1;
    }
    25%,
    75% {
      opacity: 0;
    }
  }
</style>
