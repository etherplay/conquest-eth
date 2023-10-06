<script lang="ts">
  import {createEventDispatcher, onMount} from 'svelte';
  const dispatch = createEventDispatcher();
  export let disableClose = false;

  onMount(() => {
    dispatch('mounted');
  });
</script>

<div class="relative bg-gray-900 border-2 border-cyan-300 top-1 mx-1 z-20">
  <div class="max-w-screen-xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
    <div class="pr-16 sm:text-center sm:px-16 text-cyan-300">
      <slot />
    </div>
    <div class="absolute inset-y-0 right-0 pt-1 pr-1 flex items-start sm:pt-1 sm:pr-2 sm:items-start">
      {#if !disableClose}
        <button
          on:click={() => dispatch('close')}
          type="button"
          class="flex p-2 rounded-md hover:bg-indigo-500 focus:outline-none focus:bg-indigo-500 transition ease-in-out duration-150"
          aria-label="Dismiss"
        >
          <!-- Heroicon name: x -->
          <svg
            class="h-6 w-6 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>
</div>
