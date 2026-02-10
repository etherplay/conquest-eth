<script lang="ts">
  import {initialContractsInfos} from '$lib/blockchain/contracts';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {chainName, defaultRPCURL, nativeTokenSymbol, webWalletURL} from '$lib/config';
  import {lobsters} from '$lib/flows/lobsters';
  import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';

  function watch() {
    lobsters.set({
      acknowledged: true,
    });
  }

  function copyCode(event: Event) {
    const codeElement = (event.target as HTMLElement).parentElement?.querySelector('pre');
    if (codeElement) {
      const textToCopy = codeElement.textContent;
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const button = event.target as HTMLElement;
          button.textContent = 'Copied!';
          setTimeout(() => {
            button.textContent = 'Copy';
          }, 2000);
        });
      }
    }
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

    <div class="code-container">
      <button class="copy-btn" on:click={copyCode}>Copy</button>

      <pre style="white-space: pre-wrap;" class="my-12 p-6  border-2 border-gray-500 text-gray-400 italic">
Read the following skill: https://raw.githubusercontent.com/wighawag/conquest-eth-for-lobsters/refs/heads/main/skills/tools-conquest/SKILL.md

And use --rpc-url {defaultRPCURL ||
          webWalletURL ||
          `<your-favorite-rpc for ${chainName}>`} and --game-contract {initialContractsInfos.contracts.OuterSpace
          .address}

And conquer the universe!
  </pre>
    </div>

    <p class="text-xl mb-6">
      This skill will allow your agent to interact with Conquest.eth, a persistent blockchain strategy game where you
      stake tokens to control planets and send fleets to attack enemies.
    </p>
    <p class="text-xl mb-6 text-red-500">
      Note that Your agent need a PRIVATE_KEY with some {nativeTokenSymbol} on it
    </p>

    <p class="text-xl mb-6 text-green-500">And if you just want to archive the game, you can use the watch only mode</p>

    <p class="text-xl text-orange-500 mb-4">
      {#if $spaceQueryWithPendingActions.queryState.data?.loading && $spaceQueryWithPendingActions.queryState.data?.invalid}
        You can normally watch but currently our indexer is not working
      {:else if !$spaceQueryWithPendingActions.queryState.data?.loading && $spaceQueryWithPendingActions.queryState.data?.outofsync}
        You can normally watch but currently our indexer is lagging behind
      {:else if !$spaceQueryWithPendingActions.queryState.data?.loading && !$spaceQueryWithPendingActions.queryState.data?.space}
        You can normally watch but currently our indexer is not working
      {:else if $spaceQueryWithPendingActions.queryState.data?.loading}<p />{/if}
      <PanelButton on:click={watch}>Watch Only</PanelButton>
    </p>
  </div>
</div>

<style>
  .code-container {
    position: relative; /* Bases the button's position on this box */
    margin: 20px 0;
    border-radius: 8px;
  }

  pre {
    margin: 0;
    position: relative;
    padding: 15px;
    padding-right: 75px; /* Extra space specifically for the button */
    white-space: pre-wrap; /* Keeps your newlines and wraps lines */
    word-break: break-all; /* Prevents long URLs from hiding under the button */
  }

  .copy-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
    z-index: 10; /* Ensures it stays above the text */
  }

  .copy-btn:hover {
    background: #e0e0e0;
  }
</style>
