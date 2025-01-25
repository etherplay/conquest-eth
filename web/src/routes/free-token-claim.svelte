<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin} from '$lib/blockchain/wallet';
  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';
  import {myTokens} from '$lib/space/token';
  import {BigNumber, BigNumberish} from '@ethersproject/bignumber';

  async function claim(amount: number) {
    if (wallet.address && wallet.contracts) {
      const numTokens = BigNumber.from(amount).mul('1000000000000000000') || $myTokens.freePlayTokenClaimBalance;
      const tx = await wallet.contracts.FreePlayTokenClaim.claim(wallet.address, numTokens);
      // TODO :
      //  account.recordWithdrawal(tx.hash, tx.nonce);
    } else {
      throw new Error(` not wallet or contracts`);
    }
  }

  let amount: number | undefined;
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
        {#if !$myTokens.freePlayTokenClaimBalance}
          <p>Please wait...</p>
          <!-- {:else if $withdrawals.pending} -->
          <!-- <p>withdrawal in progress..</p> -->
        {:else}
          <p class="m-2 text-center">
            Amount available: {$myTokens.freePlayTokenClaimBalance.div('10000000000000000').toNumber() / 100}
          </p>
        {/if}

        <input
          class="bg-black text-white border-2 p-1 border-white"
          bind:value={amount}
          type="number"
          step="1"
          placeholder="all"
        />
        <Button
          class="block w-max-content m-4"
          label="withdraw"
          disabled={!$myTokens.freePlayTokenClaimBalance || $myTokens.freePlayTokenClaimBalance.eq(0)}
          on:click={() => claim(amount)}
        >
          claim
        </Button>
      {/if}
    </div>
  </WalletAccess>
</div>
