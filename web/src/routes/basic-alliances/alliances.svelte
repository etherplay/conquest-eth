<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {onMount} from 'svelte';
  import Blockie from '$lib/components/account/Blockie.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {flow, wallet} from '$lib/blockchain/wallet';
  import {Contract} from '@ethersproject/contracts';
  import {hexZeroPad} from '@ethersproject/bytes';
  import {contractsInfos} from '$lib/blockchain/contracts';
  import {formatError} from '$lib/utils';
  import type {WalletData} from 'web3w';

  // import messageFlow from '$lib/messages/message';
  // import MessageFlow from '$lib/messages/MessageFlow.svelte';
  // import Header from '$lib/navigation/header.svelte';
  import {playersQuery} from '$lib/space/playersQuery';
  import {url} from '$lib/utils/url';
  import {BigNumber} from '@ethersproject/bignumber';

  function connect() {
    flow.connect();
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

  async function kick(playerAddress: string) {
    await flow.execute(async (contracts) => {
      await contracts.AllianceRegistry.kick(playerAddress);
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
      const contract = new Contract(
        id,
        $contractsInfos.contracts.BasicAllianceFactory.abi,
        wallet.provider.getSigner()
      );
      await contract.addMembers([
        {
          addr: joinerAddress,
          nonce,
          signature: signature,
        },
      ]);
    });
  }

  let addressToInvite: string | undefined;
  let inviteURL: string | undefined;
  async function createInvite() {
    await flow.execute(async (contracts) => {
      const allianceData = await contracts.AllianceRegistry.callStatic.getAllianceData(addressToInvite, id);
      if (allianceData.joinTime.gt(0)) {
        throw new Error('already in alliance');
      }
      const p = contracts.BasicAllianceFactory._proxiedContract;
      const BasicAlliance = p.attach(id);
      let memberNonce = await BasicAlliance.callStatic.memberNonces(addressToInvite);

      if (typeof memberNonce === 'number') {
        memberNonce = BigNumber.from(memberNonce);
      }

      let message = `Invite Player ${hexZeroPad(addressToInvite.toLowerCase(), 20)} To Alliance ${hexZeroPad(
        id.toLowerCase(),
        20
      )}`;
      if (memberNonce.gt(0)) {
        message = `Invite Player ${hexZeroPad(addressToInvite.toLowerCase(), 20)} To Alliance ${hexZeroPad(
          id.toLowerCase(),
          20
        )} (nonce: ${('' + memberNonce.toNumber()).padStart(10, ' ')})`;
      }
      console.log({message});
      const signature = await wallet.provider.getSigner().signMessage(message);
      inviteURL =
        location.protocol +
        '//' +
        location.hostname +
        (location.port ? ':' + location.port : '') +
        `/basic-alliances/invite/#${addressToInvite}:${id}:${memberNonce}:${signature}`;
    });
  }

  let addressToRemove: string | undefined;
  async function removeMember() {
    await flow.execute(async (contracts) => {
      const contract = new Contract(id, ['function removeMember(address)'], contracts.BasicAllianceFactory.signer);
      await contract.removeMember(addressToRemove);
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
          const contract = new Contract(id, $contractsInfos.contracts.BasicAllianceFactory.abi, wallet.provider);
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
    id = location.hash.slice(1);
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

  let isAllianceMember = false;
  $: {
    isAllianceMember = false;
    const data = $playersQuery.data;
    const player = data && data.players[$wallet.address?.toLowerCase()];
    if (player) {
      for (const alliance of player.alliances) {
        if (alliance.address == id) {
          isAllianceMember = true;
        }
      }
    }
  }

  $: isAdmin = admin && $wallet.address?.toLowerCase() === admin;
</script>

<!-- <Header /> -->

<WalletAccess>
  <div class="py-16 bg-gray-50 overflow-hidden lg:py-24">
    <div class="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
      <div class="relative">
        {#if id}
          <h2 class="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <Blockie address={id} class="w-12 h-12 inline" />
          </h2>
          <h2
            class="text-center md:text-xl lg-text-2xl text-base sm:text-basetext-center  leading-8 font-extrabold tracking-tight text-gray-500"
          >
            Alliance {id}
          </h2>
        {/if}
      </div>

      <div class="m-2">
        {#if $wallet.state !== 'Ready'}
          <!-- <PanelButton on:click={connect} label="Connect">Connect</PanelButton> -->
          <div class="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <PanelButton on:click={connect} label="Connect">Connect Your Wallet</PanelButton>
          </div>
        {:else}
          {#if step === 'LOADING'}
            <p>Loading ...</p>
          {:else if step === 'IDLE'}
            {#if error}
              {error}
            {/if}
            <PanelButton on:click={() => flow.connect()} label="load">load</PanelButton>
          {:else if !id}
            <!-- nothing -->
          {:else}
            <h2 class="md:text-xl lg-text-2xl text-base text-green-600">
              Members
              <ul>
                {#each $playersQuery.data?.alliances[id].members || [] as member}
                  <li class="m-2">
                    <Blockie class="inline-block" address={member.address} />
                    {member.address}
                    <!-- TODO -->
                    <!-- {#if isAdmin && member.address !== $wallet.address.toLowerCase()}<PanelButton on:click={kick}
                        >Kick</PanelButton
                      >{/if} -->
                  </li>
                {/each}
              </ul>
            </h2>
            <div class="w-full border-2 border-black my-2" />

            {#if !isAdmin}
              {#if isAllianceMember}
                <div>
                  <PanelButton on:click={leave} label="Join">Leave Alliance</PanelButton>
                </div>
              {:else}
                <h2 class="text-xl text-green-500">Do you want to join the alliance ?</h2>
                <div>
                  <PanelButton on:click={join} label="Join">Request to Join</PanelButton>
                </div>

                {#if signedMessage}
                  <p>Copy this string and send it to the admin:</p>
                  <pre class="bg-blue-800 text-white" on:click={select}>{signedMessage}</pre>
                {/if}

                <!-- The Administrator to contact : <Blockie class="w-6 h-6 m-1 inline" address={admin} />{admin} (<button
                  class="underline"
                  on:click={() => messageFlow.show(admin)}>contact admin</button
                >) -->
              {/if}
            {:else}
              <h2 class="md:text-xl lg-text-2xl text-base text-green-600">
                You are the administrator of this alliance.
              </h2>
              <div class="w-full border-2 border-black my-2" />
              <h3 class="text-xl text-green-600">do you want to add members?</h3>

              <div>
                <div>
                  <label for="addressToInvite">Address:</label><input
                    id="addressToInvite"
                    type="text"
                    bind:value={addressToInvite}
                    class="bg-gray-200"
                  />
                </div>
                <PanelButton on:click={createInvite} label="Create Invite">Create Invite</PanelButton>

                {#if inviteURL}
                  <a href={`${inviteURL}`} target="_blank" class="underline">Invite Link</a>
                {/if}
              </div>

              <h3 class="text-xl text-green-600">do you want to remove members?</h3>

              <div>
                <div>
                  <label for="addressToRemove">Address:</label><input
                    id="addressToRemove"
                    type="text"
                    bind:value={addressToRemove}
                    class="bg-gray-200"
                  />
                </div>
                <PanelButton on:click={removeMember} label="Remove">Remove</PanelButton>
              </div>

              <div class="w-full border-2 border-black my-2" />

              <div>
                <PanelButton on:click={leave} label="Join">Leave Your Own Alliance</PanelButton>
              </div>
            {/if}
          {/if}

          <hr class="m-8" />
          {#if isAdmin}
            <p>Or maybe you want to create another alliance ?</p>
          {:else}
            <p>Or do you want to create your own alliance?</p>
          {/if}

          <div class="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <PanelButton href={url('/')} label="Connect">Create An Alliance</PanelButton>
          </div>

          <div />
        {/if}
      </div>
    </div>
  </div>
</WalletAccess>

<!-- TODO share that in _layout ? -->
<!-- {#if $messageFlow.error || $messageFlow.step !== 'IDLE'}
  <MessageFlow />
{/if} -->
