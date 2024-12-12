<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin, flow} from '$lib/blockchain/wallet';

  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';
  import {myTokens} from '$lib/space/token';
  import {formatEther} from '@ethersproject/units';
  import {BigNumber} from '@ethersproject/bignumber';

  let amount;

  $: {
    if (!amount && $myTokens.playTokenBalance) {
      amount = $myTokens.playTokenBalance.div('100000000000000').toNumber() / 10000;
    }
  }

  async function cashout(amount: number) {
    if (wallet.address && wallet.contracts) {
      const tx = await wallet.contracts.PlayToken.burn(
        wallet.address,
        BigNumber.from(amount * 10000).mul('100000000000000')
      );
      // TODO :
      //  account.recordWithdrawal(tx.hash, tx.nonce);
    } else {
      throw new Error(` not wallet or contracts`);
    }
  }
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
      {:else if !$myTokens.playTokenBalance}
        <p>Please wait...</p>
        <!-- {:else if $withdrawals.pending} -->
        <!-- <p>withdrawal in progress..</p> -->
      {:else}
        <p class="m-2 text-center">
          Amount available: {formatEther($myTokens.playTokenBalance)}
        </p>

        {#if $myTokens.playTokenBalance.gt(0)}
          <input
            step="0.1"
            max={$myTokens.playTokenBalance.div('100000000000000000').toNumber() / 10}
            class="bg-black"
            type="number"
            bind:value={amount}
          />
        {/if}
        <Button
          class="block w-max-content m-4"
          label="cashout"
          disabled={$myTokens.playTokenBalance.lte(0)}
          on:click={() => cashout(amount)}
        >
          Cash out
        </Button>
      {/if}
    </div>
  </WalletAccess>
</div>
