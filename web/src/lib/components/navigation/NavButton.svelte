<script lang="ts">
  import {text} from 'svelte/internal';
  import InnerButton from './InnerButton.svelte';
  let class_names = '';
  export {class_names as class};
  export let label: string;

  export let href: string | undefined = undefined;
  export let blank = false;

  export let borderColor = 'border-cyan-300';
  export let textColor = 'text-cyan-300';
</script>

<div class="inline-block {textColor} {borderColor} {class_names}">
  {#if href}
    <div class="relative p-1 {textColor} {borderColor}">
      <a
        aria-label={label}
        title={label}
        {href}
        rel={blank === true ? 'noopener' : ''}
        target={blank === true ? '_blank' : ''}
      >
        <InnerButton {borderColor}>
          <slot />
        </InnerButton>
      </a>
    </div>
  {:else}
    <button {label} class="relative p-1 {textColor} {borderColor}">
      <InnerButton {borderColor} on:click>
        <slot />
      </InnerButton>
    </button>
  {/if}
</div>
