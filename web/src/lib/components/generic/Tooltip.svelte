<script lang="ts">
  let class_names = '';
  export {class_names as class};

  import tippy from 'sveltejs-tippy';

  // let currentTippy: {setProps: (props: {content: string}) => void};
  function tooltip(node: Element, wrapper: HTMLElement) {
    let content;
    if (wrapper) {
      content = wrapper.innerHTML;
      tippy(node, {
        content,
        allowHTML: true,
        interactive: true,
        interactiveBorder: 10,
      });
    }
    return {
      update: (wrapper: HTMLElement) => {
        const content = wrapper.innerHTML;
        tippy(node, {
          content,
          allowHTML: true,
          interactive: true,
          interactiveBorder: 10,
        });
      },
    };
  }

  let wrapper: HTMLElement;
</script>

<div on:click={(e) => e.stopPropagation()} use:tooltip={wrapper} class="inline {class_names}">
  <slot />
</div>
<div bind:this={wrapper} class="hidden">
  <slot name="tooltip" />
</div>
