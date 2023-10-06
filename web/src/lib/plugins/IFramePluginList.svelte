<script lang="ts">
  import IFramePlugin from './IFramePlugin.svelte';
  import plugins from '$lib/plugins/plugins';
</script>

{#each $plugins as plugin}
  <IFramePlugin title={plugin.name} src={plugin.iframe} pluginConfig={plugin.config} />
{/each}
