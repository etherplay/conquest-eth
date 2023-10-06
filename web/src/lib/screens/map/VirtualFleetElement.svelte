<script lang="ts">
  import {camera} from '$lib/map/camera';
  import type {VirtualFleet} from '$lib/flows/send';
  export let fleet: VirtualFleet;

  $: angle = Math.atan2(
    fleet.to.location.globalY - fleet.from.location.globalY,
    fleet.to.location.globalX - fleet.from.location.globalX
  );

  $: distanceSquare =
    Math.pow(fleet.to.location.globalX - fleet.from.location.globalX, 2) +
    Math.pow(fleet.to.location.globalY - fleet.from.location.globalY, 2);

  $: x1 = fleet.from.location.globalX + (distanceSquare > 10 ? Math.cos(angle) * 1.4 : 0);
  $: y1 = fleet.from.location.globalY + (distanceSquare > 10 ? Math.sin(angle) * 1.4 : 0);
  $: x2 = fleet.to.location.globalX - (distanceSquare > 10 ? Math.cos(angle) * 1.4 : 0);
  $: y2 = fleet.to.location.globalY - (distanceSquare > 10 ? Math.sin(angle) * 1.4 : 0);

  $: scale = $camera ? $camera.renderScale : 1;

  let lineColor = 'white';
</script>

<svg style={`position: absolute; z-index: 2; overflow: visible;`}>
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
    style="z-index: 1;"
    stroke-width={`${4 / scale}px`}
    stroke={lineColor}
    {x1}
    {y1}
    {x2}
    {y2}
  />
</svg>
