<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin, flow} from '$lib/blockchain/wallet';

  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';
  import {BigNumber} from '@ethersproject/bignumber';
  import {parseEther} from '@ethersproject/units';
  import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
  import {Wallet} from '@ethersproject/wallet';
  import {nativeTokenSymbol} from '$lib/config';

  let amount = 25;
  let nativeTokenAmount = 2;
  let address: string | undefined;

  async function sendFreeTokens() {
    if (wallet.address && wallet.contracts) {
      const claimKeyETHAmount = BigNumber.from(nativeTokenAmount * 10000).mul('100000000000000');
      const tokenAmount = BigNumber.from(amount * 10000).mul('100000000000000');

      let addressToUse = address;

      let privateKey;
      if (address.startsWith('http')) {
        const hashIndex = address.indexOf('#tokenClaim=');
        privateKey = address.slice(hashIndex + 12);
        addressToUse = new Wallet(privateKey).address;
      } else if (address.length > 42) {
        privateKey = address;
        addressToUse = new Wallet(address).address;
      }

      console.log({address: addressToUse, privateKey});

      const amountOfNativeToken = tokenAmount
        .mul(parseEther('1'))
        .div(contractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals);
      const tx = await wallet.contracts.FreePlayToken.mintViaNativeTokenPlusSendExtraNativeTokens(
        addressToUse,
        tokenAmount,
        {
          value: amountOfNativeToken.add(claimKeyETHAmount),
        }
      );
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
      {:else}
        <label for="address">address: </label><input id="address" class="bg-gray-600" bind:value={address} />

        <label for="amount">number of tokens: </label><input
          id="amount"
          class="bg-gray-700"
          type="number"
          step="0.1"
          bind:value={amount}
        />

        <label for="nativeTokenAmount">number of {nativeTokenSymbol}: </label><input
          id="nativeTokenAmount"
          class="bg-gray-700"
          type="number"
          step="0.1"
          bind:value={nativeTokenAmount}
        />
        <Button class="block w-max-content m-4" label="send" on:click={() => sendFreeTokens()}>Send</Button>
      {/if}
    </div>
  </WalletAccess>
</div>
