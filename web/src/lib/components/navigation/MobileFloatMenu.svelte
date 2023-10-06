<script lang="ts">
  import MobileFloatMenuLink from './MobileFloatMenuLink.svelte';

  type LinkInfo = {href: string; title: string};
  export let links: LinkInfo[];
</script>

{#each links as link}
  <MobileFloatMenuLink href={link.href} title={link.title} />
{/each}
