<script lang="ts">
  let class_names = '';
  export {class_names as class};
  export let inverted = false;

  import tippy from 'sveltejs-tippy';

  // let currentTippy: {setProps: (props: {content: string}) => void};
  function tooltip(node: Element, wrapper: HTMLElement) {
    let content;
    if (wrapper) {
      content = wrapper.innerHTML;
      tippy(node, {
        content,
        allowHTML: true,
      });
    }
    return {
      update: (wrapper: HTMLElement) => {
        const content = wrapper.innerHTML;
        tippy(node, {
          content,
          allowHTML: true,
        });
      },
    };
  }

  let wrapper: HTMLElement;
</script>

{#if inverted}
  <svg
    on:click={(e) => e.stopPropagation()}
    use:tooltip={wrapper}
    class="inline {class_names} text-green-500"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fill-rule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
      clip-rule="evenodd"
    />
  </svg>
{:else}
  <svg
    on:click={(e) => e.stopPropagation()}
    use:tooltip={wrapper}
    class="inline {class_names} text-green-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
{/if}
<div bind:this={wrapper} class="hidden">
  <slot />
</div>
