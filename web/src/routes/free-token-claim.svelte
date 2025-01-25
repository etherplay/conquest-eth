<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin} from '$lib/blockchain/wallet';
  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';
  import {myTokens} from '$lib/space/token';
  import {BigNumber, BigNumberish} from '@ethersproject/bignumber';
  import {wait} from '$lib/utils';

  let error: string | undefined;
  let waiting_tx: {balanceBefore: BigNumber; txMinted: boolean} | undefined;
  async function claim(amount: number | undefined) {
    try {
      if (amount === 0) {
        throw new Error('zero amount');
      }
      if (wallet.address && wallet.contracts) {
        const numTokens = amount
          ? BigNumber.from(amount).mul('1000000000000000000')
          : $myTokens.freePlayTokenClaimBalance;

        const balanceBefore = $myTokens.freePlayTokenClaimBalance;
        const tx = await wallet.contracts.FreePlayTokenClaim.claim(wallet.address, numTokens);
        waiting_tx = {balanceBefore, txMinted: false};
        await tx.wait();
        waiting_tx = {balanceBefore, txMinted: true};
        while (waiting_tx) {
          if ($myTokens.freePlayTokenClaimBalance.lt(waiting_tx.balanceBefore)) {
            waiting_tx = undefined;
          }
          console.log('waiting for balance to update');
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        // TODO :
        //  account.recordWithdrawal(tx.hash, tx.nonce);
      } else {
        throw new Error(` not wallet or contracts`);
      }
    } catch (err: any) {
      error = err.message || err;
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
        {#if error}
          <div class="text-center">
            <p class="text-red-500">{error}</p>
            <Button
              class="block w-max-content m-4"
              borderColor="border-red-500"
              color="text-red-500"
              label="ok"
              on:click={() => (error = undefined)}
            >
              OK
            </Button>
          </div>
        {:else if waiting_tx}
          {#if waiting_tx.txMinted}
            <p>Please wait the balance get updated...</p>
          {:else}
            <p>Please wait the tx get included...</p>
          {/if}
        {:else if !$myTokens.freePlayTokenClaimBalance}
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
          label="claim"
          disabled={!$myTokens.freePlayTokenClaimBalance || $myTokens.freePlayTokenClaimBalance.eq(0) || waiting_tx}
          on:click={() => claim(amount)}
        >
          claim
        </Button>
      {/if}
    </div>
  </WalletAccess>
</div>
