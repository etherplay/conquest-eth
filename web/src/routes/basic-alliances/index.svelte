<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {flow, wallet} from '$lib/blockchain/wallet';
  import {hexZeroPad} from '@ethersproject/bytes';

  import {Wallet} from '@ethersproject/wallet';
  import {playersQuery} from '$lib/space/playersQuery';
  import {url} from '$lib/utils/url';
  import Modal from '$lib/components/generic/Modal.svelte';

  function connect() {
    flow.connect();
  }

  let txHash: string | undefined;
  async function create() {
    await flow.execute(async (contracts) => {
      const salt = Wallet.createRandom().privateKey;
      const deterministicAddress = await contracts.BasicAllianceFactory.getAddress(salt);

      // TODO allow multiple members at creation
      const message = `Join Alliance ${hexZeroPad(deterministicAddress.toLowerCase(), 20)}`;
      const signature = await wallet.provider.getSigner().signMessage(message);
      const tx = await contracts.BasicAllianceFactory.instantiate(
        wallet.address,
        [{addr: wallet.address, nonce: 0, signature}],
        salt
      );
      txHash = tx.hash;

      await tx.wait();
      txHash = undefined;
    });
  }
</script>

<!-- <Header home={true} /> -->

<WalletAccess>
  <div class="py-16 bg-gray-50 overflow-hidden lg:py-24">
    <div class="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
      <div class="relative mb-8">
        <h2 class="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          conquest.eth's Basic Alliance
        </h2>
        <p class="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">Your Alliances</p>
      </div>

      <div class="m-2">
        {#if $wallet.connecting}
          <p class="text-center m-8 text-gray-500">Connecting...</p>
        {:else if $wallet.state !== 'Ready'}
          <!-- <PanelButton on:click={connect} label="Connect">Connect</PanelButton> -->
          <div class="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <PanelButton on:click={connect} label="Connect">Connect Your Wallet</PanelButton>
          </div>
        {:else}
          {#if $playersQuery.step === 'LOADING' || $playersQuery.data?.loading}
            <p class="text-center m-8 text-gray-500">Loading...</p>
          {:else if $playersQuery.data?.players[$wallet.address.toLowerCase()] && $playersQuery.data?.players[$wallet.address.toLowerCase()].alliances.length > 0}
            {#each $playersQuery.data?.players[$wallet.address.toLowerCase()].alliances as alliance}
              <a
                type="button"
                href={url('basic-alliances/alliances/', `${alliance.address}`)}
                class="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {alliance.address}
              </a>
            {/each}
          {:else}
            <p class="text-center m-8 text-gray-500">You are not part of any alliance</p>
          {/if}

          <button
            type="button"
            on:click={create}
            class="relative block w-full border-2 border-gray-300 border-dashed rounded-lg p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              ><path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              /></svg
            >
            <span class="mt-2 block text-sm font-medium text-gray-900"> Create a new alliance </span>
          </button>
          <div />
        {/if}
      </div>
    </div>
  </div>
</WalletAccess>

{#if txHash}
  <Modal>Waiting for transaction...</Modal>
{/if}
