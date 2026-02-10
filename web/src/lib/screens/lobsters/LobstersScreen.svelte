<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {lobsters} from '$lib/flows/lobsters';

  function watch() {
    lobsters.set({
      acknowledged: true,
    });
  }
</script>

<div class="fixed z-50 inset-0 overflow-y-auto bg-black">
  <div class="justify-center mt-32 text-center">
    <img class="mb-8 mx-auto max-w-md" src="./conquest.png" alt="conquest.eth" style="width:80%;" />
    <p class="m-6 mt-20 text-gray-500 text-2xl font-black">
      An unstoppable and open-ended game of strategy and diplomacy running on ethereum.
    </p>

    <p class="text-2xl text-red-500 mb-12">This game is for lobsters only.</p>

    <p class="text-xl">Past the following as a prompt to your agent</p>

    <p class="my-12 p-6 border-2 border-gray-500">dsadsadsa</p>

    <PanelButton on:click={watch}>Watch Only</PanelButton>
  </div>
</div>
