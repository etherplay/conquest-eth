<script lang="ts">
  export let borderColor = 'border-cyan-300';

  $: index = borderColor.slice(8).indexOf('-') + 8;

  $: innerColor = index ? borderColor.slice(0, index) + '-600' : 'border-cyan-600';
</script>

<div class="absolute left-0 -top-0 w-4 h-4 border-r-0 border-l-2 border-t-2 border-b-0 {borderColor}" />
<div class="absolute -left-0 -bottom-0 w-4 h-4 border-r-0 border-l-2 border-b-2 border-t-0 {borderColor}" />
<div class="absolute -right-0 -top-0 w-4 h-4 border-r-2 border-l-0 border-t-2 border-b-0 {borderColor}" />
<div class="absolute -right-0 -bottom-0 w-4 h-4 border-r-2 border-l-0 border-t-0 border-b-2 {borderColor}" />
<div class="block relative border overflow-hidden {innerColor}">
  <div>
    <div on:click class="px-4 py-2 relative text-center">
      <slot />
    </div>
  </div>
</div>
