<script lang="ts">
  import {base} from '$app/paths';
  import NavButton from '$lib/components/navigation/NavButton.svelte';

  import plugins from '$lib/plugins/plugins';
  $: pluginList = $plugins;

  let pluginToAdd: string | undefined;
  async function submit() {
    if (!pluginToAdd) {
      // TODO error, also below
      return;
    }
    const url = pluginToAdd;
    const resp = await fetch(url);
    const json = await resp.json();
    if (json.name) {
      const found = $plugins.find((v) => v.name === json.name);
      if (!found) {
        if (json.iframe.startsWith('.')) {
          const folder = url.lastIndexOf('/');
          let base = url;
          if (folder >= 0) {
            base = url.substring(0, folder);
          }
          json.iframe = base + json.iframe.substring(1);
        }

        console.log(json);

        $plugins = $plugins.concat(json);
      }
    }
  }
</script>

<div class="w-full h-full bg-black">
  <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>
  <p>plugin json url:</p>
  <input class="text-black" type="text" bind:value={pluginToAdd} />
  <button on:click={submit}>submit</button>

  {#each pluginList as plugin}
    <p>{plugin.name}</p>
    <button on:click={() => ($plugins = $plugins.filter((v) => !v.name))}>remove</button>
  {/each}
</div>
