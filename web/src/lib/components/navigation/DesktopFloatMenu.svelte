<script lang="ts">
  import {createEventDispatcher} from 'svelte';
  import DesktopFloatMenuLink from './DesktopFloatMenuLink.svelte';

  type LinkInfo = {href: string; title: string};
  export let links: LinkInfo[];

  const dispatch = createEventDispatcher();

  function anyClick() {
    dispatch('click');
  }
</script>

{#each links as link}
  <DesktopFloatMenuLink on:click={anyClick} href={link.href} title={link.title} />
{/each}
