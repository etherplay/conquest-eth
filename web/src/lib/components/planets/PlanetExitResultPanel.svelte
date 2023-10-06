<!-- TODO delete ?-->
<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  // import privateAccount from '$lib/account/privateAccount';
  export let exit: {txHash: string; location: string};
  function deleteExit() {
    // privateAccount.deleteExit(exit.location);
  }
</script>

<p class="p-2">The Exit Transaction Failed</p>
<p class="p-2">
  See
  <a
    target="_blank"
    class="underline text-cyan-100"
    href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${exit.txHash}`}>here</a
  >
</p>
<PanelButton label="Connect your wallet" class="m-2" on:click={() => deleteExit()}>
  <div class="w-20">OK</div>
</PanelButton>
