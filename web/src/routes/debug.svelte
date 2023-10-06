<script lang="ts">
  import ConnectPanel from '$lib/components/account/ConnectPanel.svelte';
  import {myplanetInfos} from '$lib/space/myplanets';
</script>

<ConnectPanel />

<div class="p-2 bg-gray-600 text-yellow-500">
  {#each $myplanetInfos as planetInfo}
    <p>{planetInfo.stats.name}</p>
  {/each}
</div>
