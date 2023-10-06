<script lang="ts">
  export let active: boolean;
  export let disabled = false;
</script>

{#if active}
  <button
    class="text-gray-200 rounded-l-lg group relative min-w-0 flex-1 overflow-hidden bg-gray-800 py-4 px-4 text-sm font-medium text-center hover:bg-gray-700 focus:z-10"
    aria-current="page"
    {disabled}
    on:click
  >
    <span><slot /></span>
    <span aria-hidden="true" class="bg-red-500 absolute inset-x-0 bottom-0 h-0.5" />
  </button>
{:else}
  <button
    class="text-gray-400 hover:text-gray-400 group relative min-w-0 flex-1 overflow-hidden bg-gray-800 py-4 px-4 text-sm font-medium text-center hover:bg-gray-700 focus:z-10"
    on:click
  >
    <span><slot /></span>
    <span aria-hidden="true" class="bg-transparent absolute inset-x-0 bottom-0 h-0.5" />
  </button>
{/if}
