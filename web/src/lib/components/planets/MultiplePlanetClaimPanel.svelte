<script lang="ts">
  import claimFlow from '$lib/flows/claim';
  import {BigNumber} from '@ethersproject/bignumber';
  import PanelButton from '../generic/PanelButton.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {initialContractsInfos} from '$lib/blockchain/contracts';
  import PlayCoin from '../utils/PlayCoin.svelte';
  import {timeToText} from '$lib/utils';
  import {myTokens} from '$lib/space/token';
  import Help from '../utils/Help.svelte';
  import {formatEther} from '@ethersproject/units';
  import {flow} from '$lib/blockchain/wallet';
  import {spaceQuery} from '$lib/space/spaceQuery';

  $: coords = $claimFlow.data?.coords;
  $: planetInfos = coords ? coords.map((v) => spaceInfo.getPlanetInfo(v.x, v.y)) : undefined;
  $: stats = planetInfos ? planetInfos.map((v) => v.stats) : undefined;
  $: totalStake = stats ? stats.reduce((prev, curr) => prev + curr.stake, 0) : undefined;
  $: cost = totalStake ? BigNumber.from(totalStake) : undefined; // TODO multiplier from config/contract

  function nativeTokenAmountFor(tokenAmountIn10000: BigNumber) {
    return (
      BigNumber.from(tokenAmountIn10000)
        .mul('1000000000000000000000')
        .div(initialContractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals)
        .toNumber() / 10000000
    );
  }

  $: paymentMethod = $claimFlow.yakuza
    ? 'nativeAndToken'
    : $myTokens.playTokenBalance.eq(0) && $myTokens.freePlayTokenBalance.eq(0)
    ? 'nativeOnly'
    : $myTokens.freePlayTokenBalance.lt(cost.mul('100000000000000')) &&
      $myTokens.playTokenBalance.lt(cost.mul('100000000000000'))
    ? 'nativeAndToken'
    : 'onlyToken';

  function cancel() {
    claimFlow.cancel(false);
  }

  function confirm() {
    if (paymentMethod === 'nativeOnly') {
      claimFlow.confirm({amountToMint: cost.mul('100000000000000'), tokenAvailable: BigNumber.from(0)});
    } else if (paymentMethod === 'nativeAndToken') {
      let yakuzaTokenAvailable = BigNumber.from(0);
      let amountToMint = cost.mul('100000000000000');

      if ($claimFlow.yakuza) {
        const yakuzaBalance = $spaceQuery.data?.yakuza?.playTokenBalance;
        if (yakuzaBalance) {
          if (yakuzaBalance.gt(amountToMint)) {
            yakuzaTokenAvailable = amountToMint;
            amountToMint = BigNumber.from(0);
          } else {
            yakuzaTokenAvailable = yakuzaBalance;
            amountToMint = amountToMint.sub(yakuzaBalance);
          }
        }
      }

      let tokenAvailable = BigNumber.from(0);
      if ($myTokens.playTokenBalance.gt(amountToMint)) {
        tokenAvailable = amountToMint;
        amountToMint = BigNumber.from(0);
      } else {
        amountToMint = amountToMint.sub($myTokens.playTokenBalance);
        tokenAvailable = $myTokens.playTokenBalance;
      }

      console.log({
        amountToMint: formatEther(amountToMint),
        tokenAvailable: formatEther(tokenAvailable),
      });
      claimFlow.confirm({
        amountToMint,
        tokenAvailable,
      });
    } else {
      claimFlow.confirm();
    }
  }

  $: YakuzaContract = (initialContractsInfos as any).contracts.Yakuza;
</script>

<div
  class="z-10 absolute right-0 top-14 inline-block w-36 md:w-48 bg-gray-900 bg-opacity-80 text-cyan-300 border-2 border-cyan-300 m-4 text-sm"
>
  <div class="flex p-3 flex-col items-center text-center">
    {#if $claimFlow.yakuza && YakuzaContract}
      <h2 class="text-red-500">
        Give the selected planets (worth ${nativeTokenAmountFor(cost)}) to Yakuza in exchange for
        {timeToText(cost.mul(YakuzaContract.linkedData.numSecondsPerTokens).toNumber(), {verbose: true})} of protection
      </h2>
      <p class="text-gray-300 mt-2 text-sm">
        You'll be able to claim revenge when other players capture any of your planet as long as the subscription does
        not expire
      </p>
    {:else}
      <h2>
        Stake
        {#if paymentMethod === 'nativeOnly'}
          (${nativeTokenAmountFor(cost)})
        {:else if paymentMethod === 'nativeAndToken'}
          <span class="text-yellow-500"
            >{$myTokens.playTokenBalance.div('100000000000000').toNumber() / 10000}
            <PlayCoin class="inline w-4" /></span
          >
          + ${nativeTokenAmountFor(cost.mul('100000000000000').sub($myTokens.playTokenBalance).div('100000000000000'))}
        {:else if $myTokens.freePlayTokenBalance.lt(cost.mul('100000000000000'))}
          <span class="text-yellow-500"
            >{totalStake / 10000}
            <PlayCoin class="inline w-4" /></span
          >
        {:else}
          <span class="text-green-500"
            >{totalStake / 10000}
            <PlayCoin class="inline w-4" free={true} /></span
          >
        {/if}
        to activate the selected planets
      </h2>
      <p class="text-gray-300 mt-2 text-sm">
        You'll be able to get the <span class="text-yellow-500"
          >{totalStake / 10000}
          <PlayCoin class="inline w-4" />
        </span>
        stake <span class="text-sm">(convertible to ${nativeTokenAmountFor(cost)})</span> back if you manage to exit the
        planet safely (this takes
        {timeToText(spaceInfo.exitDuration, {verbose: true})}).
      </p>
    {/if}
  </div>
  <div class="flex p-3 flex-col items-center">
    <PanelButton label="Cancel" class="m-2" on:click={confirm}>
      <div class="w-20">Confirm</div>
    </PanelButton>

    <PanelButton label="Cancel" class="m-2" on:click={cancel}>
      <div class="w-20">Cancel</div>
    </PanelButton>
  </div>

  {#if YakuzaContract}
    <label class="flex items-center m-2">
      <input type="checkbox" class="form-checkbox" bind:checked={$claimFlow.yakuza} />

      <span class="ml-2 text-red-500"
        >Stake for Yakuza
        <Help class="w-4"
          >You can stake planet for Yakuza, any payment you do count toward your subscription.
        </Help></span
      >
    </label>
  {/if}
</div>
