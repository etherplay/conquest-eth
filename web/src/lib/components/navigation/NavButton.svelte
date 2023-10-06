<script lang="ts">
  import InnerButton from './InnerButton.svelte';
  let class_names = '';
  export {class_names as class};
  export let label: string;

  export let href: string | undefined = undefined;
  export let blank = false;
</script>

<div class="inline-block text-cyan-300 border-cyan-300 {class_names}">
  {#if href}
    <div class="relative p-1 text-cyan-300 border-cyan-300">
      <a
        aria-label={label}
        title={label}
        {href}
        rel={blank === true ? 'noopener' : ''}
        target={blank === true ? '_blank' : ''}
      >
        <InnerButton>
          <slot />
        </InnerButton>
      </a>
    </div>
  {:else}
    <button {label} class="relative p-1 text-cyan-300 border-cyan-300">
      <InnerButton on:click>
        <slot />
      </InnerButton>
    </button>
  {/if}
</div>
