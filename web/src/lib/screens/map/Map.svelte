<script lang="ts">
  import {onDestroy, onMount} from 'svelte';
  import {camera} from '$lib/map/camera';
  import type {RenderView} from '$lib/map/renderview';
  import {ElementRenderView} from '$lib/map/renderview';
  import CSSRenderer from './CSSRenderer.svelte';
  import {planetStates} from '$lib/space/planetStates';
  import selection from '$lib/map/selection';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {fleetList} from '$lib/space/fleets';
  import fleetselection from '$lib/map/fleetselection';

  let surface: HTMLElement;
  let renderView: RenderView;
  let cancelRenderViewUpdate: number;

  function update(): void {
    renderView.update();
    cancelRenderViewUpdate = window.requestAnimationFrame(update);
  }

  function onClick(x: number, y: number): void {
    const locX = Math.floor((Math.round(x) + 2) / 4);
    const locY = Math.floor((Math.round(y) + 2) / 4);
    for (let i = 0; i < 9; i++) {
      const offsetX = i % 3;
      const offsetY = Math.floor(i / 3);
      const planetInfo = spaceInfo.getPlanetInfo(
        locX + (offsetX == 2 ? -1 : offsetX),
        locY + (offsetY == 2 ? -1 : offsetY)
      );

      // console.log({
      //   x,
      //   y,
      //   zoom: camera.zoom,
      //   pX: planetInfo && planetInfo.location.globalX,
      //   pY: planetInfo && planetInfo.location.globalY,
      // });

      if (planetInfo) {
        const multiplier = planetInfo.stats.production / 3600;

        if (
          Math.sqrt(Math.pow(planetInfo.location.globalX - x, 2) + Math.pow(planetInfo.location.globalY - y, 2)) <=
          (camera.zoom < 3 ? 6 / camera.zoom : 2) * multiplier
        ) {
          // if error =>

          // if event =>

          // if fleet ?

          // console.log(JSON.stringify(planet, null, '  '));
          selection.select(planetInfo.location.x, planetInfo.location.y);
          return;
        }
      }

      const fleets = fleetList.state.fleets;
      for (const fleet of fleets) {
        // TODO duplicate of FleetElement
        //  reuse or compute in Fleet

        const angle = Math.atan2(
          fleet.to.location.globalY - fleet.from.location.globalY,
          fleet.to.location.globalX - fleet.from.location.globalX
        );

        const ratio = Math.max(0, (fleet.duration - fleet.timeLeft) / fleet.duration);

        const distanceSquare =
          Math.pow(fleet.to.location.globalX - fleet.from.location.globalX, 2) +
          Math.pow(fleet.to.location.globalY - fleet.from.location.globalY, 2);

        const x1 = fleet.from.location.globalX + (distanceSquare > 10 ? Math.cos(angle) * 1.4 : 0);
        const y1 = fleet.from.location.globalY + (distanceSquare > 10 ? Math.sin(angle) * 1.4 : 0);
        const x2 = fleet.to.location.globalX - (distanceSquare > 10 ? Math.cos(angle) * 1.4 : 0);
        const y2 = fleet.to.location.globalY - (distanceSquare > 10 ? Math.sin(angle) * 1.4 : 0);

        const scale = $camera ? $camera.renderScale : 1;
        const multiplier = (400 / scale) * 6;

        const dx = Math.cos(angle + Math.PI) * (3 / camera.zoom);
        const dy = Math.sin(angle + Math.PI) * (3 / camera.zoom);
        const fx = x1 + (x2 - x1) * ratio + dx;
        const fy = y1 + (y2 - y1) * ratio + dy;

        if (Math.sqrt(Math.pow(fx - x, 2) + Math.pow(fy - y, 2)) <= 20 / camera.zoom) {
          console.log({x, y, fx, fy, scale});
          console.log(fleet);
          fleetselection.select(fleet);
          return;
        }
      }
    }
    selection.unselect();
    fleetselection.unselect();
  }

  onMount(() => {
    renderView = new ElementRenderView(surface);
    camera.start(surface, renderView);
    cancelRenderViewUpdate = window.requestAnimationFrame(update);
    planetStates.start(); // this trigger the queries (but not in the dev server)
    camera.onClick = onClick;
  });

  onDestroy(() => {
    if (camera) {
      camera.onClick = undefined;
    }
    camera.stop();
    if (cancelRenderViewUpdate) {
      window.cancelAnimationFrame(cancelRenderViewUpdate);
    }
  });
</script>

<div id="surface" unselectable={true} onselectstart={() => false} bind:this={surface}>
  <CSSRenderer />
</div>

<style>
  #surface {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    background-color: #000; /* #21262c; */ /*#1f253a;*/ /*#272e49;*/
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    -webkit-user-select: none; /* Safari */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* IE10+/Edge */
    user-select: none; /* Standard */
    overflow: hidden;
    /* outline: 3px blue solid; */
  }

  /* #surface {
    background-color: black;
    background-image: radial-gradient(white, rgba(255, 255, 255, 0.2) 2px, transparent 40px),
      radial-gradient(white, rgba(255, 255, 255, 0.15) 1px, transparent 30px),
      radial-gradient(white, rgba(255, 255, 255, 0.1) 2px, transparent 40px),
      radial-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1) 2px, transparent 30px);
    background-size: 550px 550px, 350px 350px, 250px 250px, 150px 150px;
    background-position: 0 0, 40px 60px, 130px 270px, 70px 100px;
  } */

  /* #surface {
    background-size: 40px 40px;
    background-image: linear-gradient(to right, grey 1px, transparent 1px),
      linear-gradient(to bottom, grey 1px, transparent 1px);
  } */

  /* #surface {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAATklEQVQoU2O0O3X+PwMDA8MhM0NGEI0LMBKtEJsJD27YgW1R0DgEtwWrdUQrxGYLY8V5iDUdhghrKFOITfenmXFgW/jSF+H3DNEKsdkCAO99IAvXcD3VAAAAAElFTkSuQmCC)
      repeat;
  } */
  /*
 background-color: #e5e5f7;
  opacity: 0.8;
  background-image:  linear-gradient(30deg, #444cf7 12%, transparent 12.5%, transparent 87%, #444cf7 87.5%, #444cf7), linear-gradient(150deg, #444cf7 12%, transparent 12.5%, transparent 87%, #444cf7 87.5%, #444cf7), linear-gradient(30deg, #444cf7 12%, transparent 12.5%, transparent 87%, #444cf7 87.5%, #444cf7), linear-gradient(150deg, #444cf7 12%, transparent 12.5%, transparent 87%, #444cf7 87.5%, #444cf7), linear-gradient(60deg, #444cf777 25%, transparent 25.5%, transparent 75%, #444cf777 75%, #444cf777), linear-gradient(60deg, #444cf777 25%, transparent 25.5%, transparent 75%, #444cf777 75%, #444cf777);
  background-size: 20px 35px;
  background-position: 0 0, 0 0, 10px 18px, 10px 18px, 0 0, 10px 18px;
  background-repeat: repeat;
*/
</style>
