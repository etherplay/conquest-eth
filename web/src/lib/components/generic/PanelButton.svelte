<script lang="ts">
  let class_names = '';
  export {class_names as class};
  export let label: string;
  export let color: string | undefined = undefined;
  export let borderColor: string | undefined = undefined;
  export let cornerColor: string | undefined = undefined;
  export let disabled = false;
  export let href: string | undefined;

  $: actualColor = disabled ? 'text-gray-600' : color || 'text-cyan-300';
  $: actualCornerColor = disabled
    ? 'border-gray-600'
    : cornerColor
    ? cornerColor
    : borderColor
    ? borderColor
    : 'border-cyan-300';
  $: actualBorderColor = disabled
    ? 'border-gray-600'
    : borderColor
    ? borderColor
    : cornerColor
    ? cornerColor
    : 'border-cyan-600';
</script>

<div class="inline-block {actualColor} {class_names}">
  <button on:click {disabled} {label} class="relative p-1">
    <div class="absolute left-0 -top-0 w-4 h-4 border-r-0 border-l-2 border-t-2 border-b-0 {actualCornerColor}" />
    <div class="absolute -left-0 -bottom-0 w-4 h-4 border-r-0 border-l-2 border-b-2 border-t-0 {actualCornerColor}" />
    <div class="absolute -right-0 -top-0 w-4 h-4 border-r-2 border-l-0 border-t-2 border-b-0 {actualCornerColor}" />
    <div class="absolute -right-0 -bottom-0 w-4 h-4 border-r-2 border-l-0 border-t-0 border-b-2 {actualCornerColor}" />
    <div class="block relative border overflow-hidden {actualBorderColor}">
      <div>
        {#if href}
          <a {href}>
            <div class="px-4 py-2 relative">
              <slot />
            </div>
          </a>
        {:else}
          <div class="px-4 py-2 relative">
            <slot />
          </div>
        {/if}
      </div>
    </div>
  </button>
</div>
