<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin, flow} from '$lib/blockchain/wallet';
  import {withdrawals} from '$lib/flows/withdrawals';
  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';
</script>

<div class="w-full h-full bg-black">
  <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>

  <br />
  <WalletAccess>
    <div class="text-cyan-300 text-center">
      {#if $privateWallet.step !== 'READY'}
        <Button
          class="w-max-content m-4"
          label="connect"
          disabled={!$builtin.available || $wallet.connecting}
          on:click={() => privateWallet.login()}
        >
          Connect
        </Button>
      {:else}
        {#if $withdrawals.state === 'Loading'}
          <p>Please wait...</p>
          <!-- {:else if $withdrawals.pending} -->
          <!-- <p>withdrawal in progress..</p> -->
        {:else}
          <p class="m-2 text-center">
            Amount available: {$withdrawals.balance.div('10000000000000000').toNumber() / 100}
          </p>
        {/if}
        <Button
          class="block w-max-content m-4"
          label="withdraw"
          disabled={$withdrawals.balance.eq(0)}
          on:click={() => withdrawals.withdraw()}
        >
          withdraw
        </Button>
      {/if}
    </div>
  </WalletAccess>
</div>
