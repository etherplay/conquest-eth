<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {BigNumber} from '@ethersproject/bignumber';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {formatError} from '$lib/utils';
  import mintFlow from '$lib/flows/mint';
  import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
  import {formatEther} from '@ethersproject/units';
  import {nativeTokenSymbol} from '$lib/config';

  let tokenAmountToMint = $mintFlow.data?.numTokenUnit;
  $: if ($mintFlow.data?.numTokenUnit && !tokenAmountToMint) {
    tokenAmountToMint = $mintFlow.data?.numTokenUnit;
  }
</script>

{#if $mintFlow.error}
  <Modal on:close={() => mintFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned For Planet Staking</h2>
      <p class="text-red-500 mt-2 text-sm">{formatError($mintFlow.error)}</p>
      <Button class="mt-5" label="Stake" on:click={() => mintFlow.acknownledgeError()}>Ok</Button>
    </div>
  </Modal>
{:else if $mintFlow.cancelingConfirmation}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    on:close={() => mintFlow.cancelCancelation()}
    on:confirm={() => mintFlow.cancel()}
  >
    <div class="text-center">
      <p class="pb-4">Are you sure to cancel ?</p>
      <p class="pb-4">(This will prevent the game to record your transaction, if you were to execute it afterward)</p>
      <Button label="OK" on:click={() => mintFlow.cancel()}>Yes</Button>
    </div>
  </Modal>
{:else if $mintFlow.step === 'TX_SUBMITTED'}
  <Modal
    >Please wait the tx to confirm... (you can also keep track of the tx : <a
      class="underline"
      href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${$mintFlow.data.txHash}`}
      target="_blank">here</a
    ></Modal
  >
{:else if $mintFlow.step === 'CONNECTING'}
  <!---->
{:else if $mintFlow.step === 'CREATING_TX'}
  <!-- {@debug $mintFlow} -->
  <Modal>Preparing the Transaction...</Modal>
{:else if $mintFlow.step === 'WAITING_TX'}
  <Modal closeButton={true} globalCloseButton={true} closeOnOutsideClick={false} on:close={() => mintFlow.cancel(true)}>
    Please Accept the Transaction...
  </Modal>
{:else if $mintFlow.step === 'WAITING_CONFIRMATION'}
  <Modal on:close={() => mintFlow.cancel()}>
    <p class="text-center" />

    Confirming will transform {formatEther(
      BigNumber.from(tokenAmountToMint * 10000)
        .mul('100000000000000')
        .mul('1000000000000000000')
        .div(contractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals)
    )}
    {nativeTokenSymbol} into {tokenAmountToMint}
    <PlayCoin class="inline w-4" />

    <p class="m-2">You can adjust the amount here</p>

    <input class="bg-black" step="0.1" type="number" bind:value={tokenAmountToMint} />

    <p class="text-center mt-3">
      <Button label="OK" on:click={() => mintFlow.confirm(tokenAmountToMint)}>Confirm</Button>
    </p>
  </Modal>
{/if}
