<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin} from '$lib/blockchain/wallet';
  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';
  import {yakuzaQuery} from '$lib/default-plugins/yakuza/yakuzaQuery';
  import {time} from '$lib/time';
  import {timeToText} from '$lib/utils';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {initialContractsInfos} from '$lib/blockchain/contracts';
  import {BigNumber} from '@ethersproject/bignumber';
  import {formatEther, formatUnits} from '@ethersproject/units';
  import {spaceQuery} from '$lib/space/spaceQuery';

  let error: string | undefined;
  let waiting_tx: {endTimeBefore: number; startTimeBefore: number; txMinted: boolean} | undefined;
  async function subscribe(amount: number | undefined) {
    try {
      if (amount === 0) {
        throw new Error('zero amount');
      }
      if (wallet.address && wallet.contracts) {
        const amountToMint = BigNumber.from(amount).mul('1000000000000000000');
        const endTimeBefore = $yakuzaQuery.data?.state?.yakuzaSubscription?.endTime || 0;
        const startTimeBefore = $yakuzaQuery.data?.state?.yakuzaSubscription?.startTime || 0;
        const nativeTokenAmount = amountToMint
          .mul('1000000000000000000')
          .div(initialContractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals);
        console.log({
          amountToMint: formatUnits(amountToMint, 'gwei'),
          nativeTokenAmount: formatUnits(nativeTokenAmount, 'gwei'),
          div: formatEther(initialContractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals),
        });
        const tx = await wallet.contracts.Yakuza.subscribeWithoutStaking(amountToMint, 0, {value: nativeTokenAmount});
        waiting_tx = {endTimeBefore, startTimeBefore, txMinted: false};
        await tx.wait();
        waiting_tx = {endTimeBefore, startTimeBefore, txMinted: true};
        while (waiting_tx) {
          if ($yakuzaQuery.data?.state?.yakuzaSubscription?.endTime > waiting_tx.endTimeBefore) {
            waiting_tx = undefined;
          }
          console.log('waiting for subscription to update');
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

  $: endTime = $yakuzaQuery.data?.state?.yakuzaSubscription.endTime || 0;
  $: expiredIn = endTime - $time;
  $: startTime = $yakuzaQuery.data?.state?.yakuzaSubscription.startTime || 0;
  $: notSubscribed = endTime == 0;
  $: expired = $time > endTime;

  let amount: number = 0;

  $: YakuzaContract = (initialContractsInfos as any).contracts.Yakuza;

  $: amountOfTime = amount
    ? YakuzaContract && BigNumber.from(amount).mul(YakuzaContract.linkedData.numSecondsPerTokens).toNumber()
    : 0;

  $: yakuzaPlayTokenBalance = $spaceQuery.data?.yakuza?.playTokenBalance
    ? formatEther($spaceQuery.data.yakuza.playTokenBalance)
    : undefined;
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
        {#if yakuzaPlayTokenBalance}
          <p>
            YAKUZA: {yakuzaPlayTokenBalance}
          </p>
        {/if}

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
            <p>Please wait the subscription get updated...</p>
          {:else}
            <p>Please wait the tx get included...</p>
          {/if}
        {:else if !$yakuzaQuery.data?.state}
          <p>Please wait...</p>
          <!-- {:else if $withdrawals.pending} -->
          <!-- <p>withdrawal in progress..</p> -->
        {:else}
          <p class="m-2 text-center">
            {#if notSubscribed}
              You are not subscribed to Yakuza
            {:else if expired}
              Your subscriptiuon expired
            {:else}
              Your subscription ends in {timeToText(expiredIn)}
            {/if}
          </p>
        {/if}

        <label for="yakuza-subscription-amount">
          {#if amount}
            {amount}
            <PlayCoin class="inline w-4" /> will give you {timeToText(amountOfTime)} from now
          {:else}
            pick an amount of token you wish to spend to subscribe
          {/if}
        </label>
        <br />
        <input
          id="yakuza-subscription-amount"
          class="bg-black text-white border-2 p-1 border-white mt-2"
          bind:value={amount}
          type="number"
          step="1"
          placeholder="all"
        />
        <br />
        <Button class="block w-max-content m-4" label="claim" disabled={waiting_tx} on:click={() => subscribe(amount)}>
          Subscribe
        </Button>
      {/if}
    </div>
  </WalletAccess>
</div>
