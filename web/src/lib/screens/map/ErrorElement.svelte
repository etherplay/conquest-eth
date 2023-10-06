<script lang="ts">
  import {camera} from '$lib/map/camera';
  import type {SpaceError} from '$lib/space/errors';
  import {spaceInfo} from '$lib/space/spaceInfo';
  export let error: SpaceError;

  $: planetInfo = spaceInfo.getPlanetInfo(error.location.x, error.location.y);
  $: x = planetInfo.location.globalX - 48 / 2;
  $: y = planetInfo.location.globalY - 48 / 2;

  $: multiplier = planetInfo.stats.production / 3600;
  $: scale = 0.025 * multiplier;

  $: color = 'red';

  $: renderScale = $camera ? $camera.renderScale : 1;

  let selectionBorder = 4;
  let adjustedRenderScale;
  let blockieScale = scale;
  // let zoomIn = true;
  $: if (renderScale < 10) {
    adjustedRenderScale = 10 / renderScale;
    blockieScale = scale * adjustedRenderScale;
    // zoomIn = false;
    selectionBorder = 4;
  } else {
    selectionBorder = 4;
    // zoomIn = true;
    blockieScale = scale;
    adjustedRenderScale = 1;
  }
</script>

<div
  id={error.txHash}
  style={`z-index: 5; pointer-events: none; position: absolute; transform: translate(${x}px,${y}px)  scale(${
    blockieScale * 3
  }, ${blockieScale * 3}); width: 48px; height: 48px;`}
>
  <div
    style={`
width: ${48}px;
height: ${48}px;
border: ${selectionBorder}px solid ${color};
animation-name: event-scale-up-flat;
animation-iteration-count: infinite;
animation-duration: 1s;
animation-timing-function: linear;
`}
  />
</div>
