<script lang="ts">
  export let title: string | undefined = undefined;
  export let value: number;
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;

  export let _class = '';
  export {_class as class};

  function decrement(e) {
    value--;
    if (value < min) {
      value = min;
    }
  }

  function increment(e) {
    value++;
    if (value > max) {
      value = max;
    }
  }
</script>

<div class={`custom-number-input inline-block ${_class}`}>
  {#if title}
    <label for="custom-input-number" class="w-full text-gray-300 text-xs font-semibold">{title}</label>
  {/if}
  <div class="flex flex-row h-full rounded-lg relative bg-transparent mt-1 justify-center">
    <button
      on:click={decrement}
      class=" bg-gray-700 text-gray-400 hover:text-gray-300 hover:bg-gray-600 h-full w-5 rounded-l cursor-pointer outline-none"
    >
      <span class="m-auto text-xs font-thin">−</span>
    </button>
    <input
      type="number"
      class="outline-none focus:outline-none text-center w-6 bg-gray-700 font-semibold hover:text-white focus:text-white  md:text-basecursor-default flex items-center text-gray-300"
      style="font-size: 0.6em"
      name="custom-input-number"
      {min}
      {max}
      bind:value
    />
    <button
      on:click={increment}
      class="bg-gray-700 text-gray-400 hover:text-gray-300 hover:bg-gray-600 h-full w-5 rounded-r cursor-pointer"
    >
      <span class="m-auto text-xs font-thin">+</span>
    </button>
  </div>
</div>

<style>
  input[type='number']::-webkit-inner-spin-button,
  input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .custom-number-input input:focus {
    outline: none !important;
  }

  .custom-number-input button:focus {
    outline: none !important;
  }
</style>
