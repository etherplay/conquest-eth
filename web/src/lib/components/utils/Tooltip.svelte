<script lang="ts">
  import tippy from 'sveltejs-tippy';

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

<div on:click={(e) => e.stopPropagation()} use:tooltip={wrapper}>
  <slot name="tooltip" />
</div>
<div bind:this={wrapper} class="hidden">
  <slot />
</div>
