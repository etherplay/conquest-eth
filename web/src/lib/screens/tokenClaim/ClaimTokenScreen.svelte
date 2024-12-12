<script lang="ts">
  import tokenClaim from './tokenClaim';
  import {wallet, chain, switchChain} from '$lib/blockchain/wallet';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {chainName, nativeTokenSymbol} from '$lib/config';
  import {privateWallet} from '$lib/account/privateWallet';
  import Blockie from '$lib/components/account/Blockie.svelte';
</script>

{#if $tokenClaim.inUrl}
  <div class="fixed z-40 inset-0 overflow-y-auto bg-black">
    <div class="relative bg-gray-900 border-2 border-cyan-300 top-1 mx-1">
      <div class="max-w-screen-xl mx-auto py-3 px-3 sm:px-6 lg:px-8">
        <div class="sm:text-center sm:px-16 text-cyan-300 text-center">Welcome to conquest.eth</div>
        <div class="absolute inset-y-0 right-0 pt-1 pr-1 flex items-start sm:pt-1 sm:pr-2 sm:items-start" />
      </div>
    </div>
    <div class="justify-center mt-10 text-center text-white">
      {#if $tokenClaim.error}
        <p class="m-5 text-red-500">{$tokenClaim.error}</p>
        <Button class="mt-4" label="ok" on:click={() => tokenClaim.acknowledgeError()}>ok</Button>
      {:else if $wallet.state === 'Ready'}
        <p>Hello</p>
        <p><Blockie class="inline-block w-12 h-12" address={$wallet.address} /></p>
        <p>{$wallet.address}</p>
        {#if $chain.notSupported}
          <p class="m-5 text-red-500">Please switch to {chainName}.</p>
          <div>
            <Button label="Unlock Wallet" on:click={switchChain}>Switch</Button>
          </div>
        {:else if $tokenClaim.state === 'Loading'}
          <p class="text-green-500">Congratulations! You have been given some tokens to claim.</p>
          <p class="text-green-500">
            Each token is worth 1 {nativeTokenSymbol}, but can only be redeemed back to {nativeTokenSymbol} after having
            the token stay ingame more than 6 days
          </p>
          <p class="mt-5">Loading claim...</p>
        {:else if $tokenClaim.state === 'Available'}
          <p class="text-green-500">Congratulations! You have been given some tokens to claim.</p>
          <p class="text-green-500">
            Each token is worth 1 {nativeTokenSymbol}, but can only be redeemed back to {nativeTokenSymbol} after having
            the token stay ingame more than 6 days
          </p>
          <Button class="mt-4" label="claim" on:click={() => tokenClaim.claim()}>Claim</Button>
        {:else if $tokenClaim.state === 'SettingUpClaim'}
          <p class="mt-5">Please wait while the claim is being executed...</p>
          {#if $tokenClaim.txHash}
            <p>
              <a
                href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${$tokenClaim.txHash}`}
                target="_blank"
                class="text-indigo-600 hover:text-indigo-100 underline">{$tokenClaim.txHash}</a
              >
            </p>
          {/if}
        {:else if $tokenClaim.state === 'Claiming'}
          <p class="mt-5">Please wait while the claim is being executed...</p>
          {#if $tokenClaim.txHash}
            <p>
              <a
                href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${$tokenClaim.txHash}`}
                target="_blank"
                class="text-indigo-600 hover:text-indigo-100 underline">{$tokenClaim.txHash}</a
              >
            </p>
          {/if}
        {:else if $tokenClaim.state === 'Claimed'}
          <p class="m-5 text-green-500">The tokens are now yours!</p>
          <Button class="mt-4" label="continue" on:click={() => tokenClaim.clearURL()}>Continue</Button>
        {:else if $tokenClaim.state === 'AlreadyClaimedAnother'}
          <p class="m-5 text-red-500">
            You already claimed tokens at this address. To ensure fairness, you should not be using multiple accounts or
            claim keys.
          </p>
          <Button class="mt-4" label="continue" on:click={() => tokenClaim.clearURL()}>Continue</Button>
        {:else if $tokenClaim.state === 'AlreadyClaimed'}
          <p class="m-5 text-red-500">The tokens have already been claimed. No more tokens to be given.</p>
          <Button class="mt-4" label="continue" on:click={() => tokenClaim.clearURL()}>Continue</Button>
        {/if}
      {:else}
        <p class="text-green-500">Congratulations! You have been given some tokens to claim.</p>
        <p class="m-5">Please connect to your wallet</p>
        <Button class="mt-4" label="connect" on:click={() => privateWallet.login()}>Connect</Button>
      {/if}
    </div>
  </div>
{/if}
