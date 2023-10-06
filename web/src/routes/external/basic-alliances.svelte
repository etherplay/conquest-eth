<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {onMount} from 'svelte';
  import {hashParams} from '$lib/config';
  import Blockie from '$lib/components/account/Blockie.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {flow, wallet} from '$lib/blockchain/wallet';
  import {Contract} from '@ethersproject/contracts';
  import {hexZeroPad} from '@ethersproject/bytes';
  import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
  import {formatError} from '$lib/utils';
  import type {WalletData} from 'web3w';

  // TODO SHare this in _layout ?
  import messageFlow from '$lib/flows/message';
  import MessageFlow from '$lib/flows/MessageFlow.svelte';
  import {Wallet} from '@ethersproject/wallet';
  import Index from '../index.svelte';

  function connect() {
    flow.connect();
  }
  function disconnect() {
    wallet.disconnect();
  }

  async function create() {
    await flow.execute(async (contracts) => {
      const salt = Wallet.createRandom().privateKey;
      const deterministicAddress = await contracts.BasicAllianceFactory.getAddress(salt);
      // TODO allow multiple members at creation
      const message = `Join Alliance ${hexZeroPad(deterministicAddress.toLowerCase(), 20)}`;
      const signature = await wallet.provider.getSigner().signMessage(message);
      await contracts.BasicAllianceFactory.instantiate(
        wallet.address,
        [{addr: wallet.address, nonce: 0, signature}],
        salt
      );
    });
  }

  async function join() {
    await flow.execute(async (contracts) => {
      const allianceData = await contracts.AllianceRegistry.callStatic.getAllianceData(wallet.address, id);
      if (allianceData.joinTime.gt(0)) {
        throw new Error('already in alliance');
      }

      let message = `Join Alliance ${hexZeroPad(id.toLowerCase(), 20)}`;
      if (allianceData.nonce.gt(0)) {
        message = `Join Alliance ${hexZeroPad(id.toLowerCase(), 20)} (nonce: ${(
          '' + allianceData.nonce.toNumber()
        ).padStart(10, ' ')})`;
      }
      console.log({message});
      const signature = await wallet.provider.getSigner().signMessage(message);
      signedMessage = wallet.address + ':' + message + `:` + signature;
    });
  }

  async function leave() {
    await flow.execute(async (contracts) => {
      await contracts.AllianceRegistry.leaveAlliance(id);
    });
  }

  async function addMember() {
    await flow.execute(async (contracts) => {
      // TODO do not use : as separator
      const components = joinMessage
        .replace(/^\s+|\s+$/g, '')
        .replace(`nonce:`, 'nonce$')
        .split(':')
        .map((v) => v.replace('nonce$', 'nonce:'));
      let nonce = 0;
      const indexOfNonce = joinMessage.indexOf('nonce:');
      if (indexOfNonce >= 0) {
        // const indexOfClosingParenthesis = joinMessage.indexOf(')');
        const nonceStr = joinMessage.slice(indexOfNonce + 6, indexOfNonce + 6 + 11).trim();
        console.log({nonceStr});
        nonce = parseInt(nonceStr);
      }
      const joinerAddress = components[0];
      const message = components[1];
      const signature = components[2];
      console.log({message, signature});
      const contract = new Contract(id, contractsInfos.contracts.BasicAllianceFactory.abi, wallet.provider.getSigner());
      await contract.addMembers([
        {
          addr: joinerAddress,
          nonce,
          signature: signature,
        },
      ]);
    });
  }

  let lastWalletState: WalletData | undefined;
  async function update() {
    if (!id) {
      admin = undefined;
      step = 'READY';
      return;
    }
    if (lastWalletState && lastWalletState.state === 'Ready') {
      if (step != 'READY' || (id && !admin)) {
        step = 'LOADING';
        try {
          const contract = new Contract(id, contractsInfos.contracts.BasicAllianceFactory.abi, wallet.provider);
          admin = (await contract.admin()).toLowerCase();
        } catch (e) {
          step = 'IDLE';
          error = formatError(e);
        }

        if (admin) {
          step = 'READY';
        }
      }
    } else {
      admin = undefined;
      step = 'IDLE';
    }
  }

  let id: string;
  onMount(() => {
    id = hashParams['id'];
    update();
  });

  let joinMessage: string | undefined;
  let signedMessage: string | undefined;
  let error: string | undefined;
  let admin: string | undefined;
  let step: 'LOADING' | 'READY' | 'IDLE' = 'IDLE';

  wallet.subscribe(async (walletState) => {
    lastWalletState = walletState;
    update();
  });

  function _select(elem: HTMLElement) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(elem);
    console.log({selection: range.toString()});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selection as any).removeAllRanges();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (selection as any).addRange(range);
  }
  function select(e: MouseEvent) {
    _select(e.currentTarget as HTMLElement);
  }
</script>

<WalletAccess>
  <div class="m-2">
    {#if $wallet.state !== 'Ready'}
      <PanelButton on:click={connect} label="Connect">Connect</PanelButton>
    {:else}
      <PanelButton class="float-right" on:click={disconnect} label="Disconnect">Disconnect</PanelButton>

      {#if id}
        <h1 class="text-xl text-yellow-500 m-4"><Blockie address={id} class="w-10 h-10 inline" /> Alliance {id}</h1>
      {/if}

      {#if step === 'LOADING'}
        <p>Loading ...</p>
      {:else if step === 'IDLE'}
        {#if error}
          {error}
        {/if}
        <PanelButton on:click={() => flow.connect()} label="load">load</PanelButton>
      {:else if !id}
        <!-- nothing -->
      {:else if $wallet.address.toLowerCase() !== admin}
        <h2 class="text-xl text-green-500">Do you want to join the alliance ?</h2>
        <div>
          <PanelButton on:click={join} label="Join">Request to Join</PanelButton>
        </div>

        {#if signedMessage}
          <p>Copy this string and send it to the admin:</p>
          <pre class="bg-blue-800 text-white" on:click={select}>{signedMessage}</pre>
        {/if}

        The Administrator to contact : <Blockie class="w-6 h-6 m-1 inline" address={admin} />{admin} (<button
          class="underline"
          on:click={() => messageFlow.show(admin)}>contact admin</button
        >)

        <div>
          <PanelButton on:click={leave} label="Join">Leave Alliance</PanelButton>
        </div>
      {:else}
        <h2 class="text-xl text-green-500">You are the administrator of this alliance. do you want to add members?</h2>
        <p>Please copy their signed message into the box to add the members</p>
        <div>
          <div>
            <textarea bind:value={joinMessage} class="bg-gray-800 w-80 h-80" />
          </div>
          <div>
            <PanelButton on:click={addMember} label="Add Member">Add Member</PanelButton>
          </div>
        </div>

        <div>
          <PanelButton on:click={leave} label="Join">Leave Your Own Alliance</PanelButton>
        </div>
      {/if}

      {#if admin && $wallet.address?.toLowerCase() === admin}
        <p class="m-8">Maybe you want to create a new alliance?</p>
      {:else}
        <p class="m-8">Maybe you want to create your own alliance?</p>
      {/if}

      <div>
        <!-- <div>
          <textarea bind:value={joinMessage} class="bg-gray-800 w-80 h-80" />
        </div> -->
        <div>
          <PanelButton on:click={create} label="Create">Create</PanelButton>
        </div>
      </div>
    {/if}
  </div>
</WalletAccess>

<!-- TODO share that in _layout ? -->
{#if $messageFlow.error || $messageFlow.step !== 'IDLE'}
  <MessageFlow />
{/if}
