<script lang="ts">
  export let value: number;
  export let name: string;
  export let min = 0;
  export let max = 100;
</script>

<!-- $: percent = Math.floor(((value - min) / div) / (div - min)); -->

<div class="m-1 w-26 md:w-36">
  <div class="w-full box-border">
    <p class="text-cyan-300 p-0 mb-1">
      {name}
      <slot />
    </p>
    <p class="float-right relative -top-6">{value}</p>
    <div class="box-border rounded-md bg-gray-600">
      <div
        class="w-full h-3 rounded-md bg-cyan-500"
        style="width: {Math.floor((100 * (value - min)) / (max - min))}%;"
      />
    </div>
  </div>
</div>
