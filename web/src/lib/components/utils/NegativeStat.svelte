<script lang="ts">
  export let value: number;
  export let name: string;
  export let min = 0;
  export let max = 100;

  $: clampValue = Math.min(Math.max(value, min), max);

  $: positive = clampValue > 0;
  $: percent = positive
    ? Math.ceil(100 * ((max - (max - clampValue)) / max))
    : Math.ceil(100 * ((min + (clampValue - min)) / min));

  // $: {
  //   console.log({
  //     clampValue,
  //     value,
  //     positive,
  //     percent,
  //     min,
  //     max,
  //   });
  // }
</script>

<!-- $: percent = Math.floor(((value - min) / div) / (div - min)); -->

<div class={`${positive ? 'text-red-500' : 'text-lime-500'} m-1 w-26 md:w-36`}>
  <div class="w-full box-border">
    <p class="p-0 mb-1">
      {name}
      <slot />
    </p>
    <p class="float-right relative -top-6">{value}</p>
    <div class="box-border h-3 rounded-md bg-gray-600">
      {#if positive}
        <div
          class="box-border inline-block h-3 rounded-r-md bg-red-500 outline-red-500 outline-1 outline-offset-1"
          style={`left:50%; width: ${percent / 2}%;position:relative;top:-0.01rem;height: 0.75rem`}
        />
      {:else}
        <div
          class="box-border inline-block h-3 rounded-l-md bg-lime-500 outline-lime-500 outline-1 outline-offset-1"
          style={`left:${50 - percent / 2}%;width:${percent / 2}%;position:relative;top:-0.01rem;height:0.75rem`}
        />
      {/if}
    </div>
  </div>
</div>
