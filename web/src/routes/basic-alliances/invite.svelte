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

  import {playersQuery} from '$lib/space/playersQuery';

  let invite:
    | {
        player: string;
        alliance: string;
        nonce: number;
        signature: string;
      }
    | undefined = undefined;

  onMount(() => {
    if (typeof location !== 'undefined' && location.hash.substr(1) !== '') {
      const splitted = location.hash.substr(1).split(':');
      if (splitted.length === 4) {
        const [player, alliance, nonce, signature] = splitted;
        invite = {
          player,
          alliance,
          nonce: parseInt(nonce),
          signature,
        };
      }
    }
    console.log(invite);
  });

  function connect() {
    flow.connect();
  }

  async function join() {
    await flow.execute(async (contracts) => {
      const allianceData = await contracts.AllianceRegistry.callStatic.getAllianceData(wallet.address, invite.alliance);
      if (allianceData.joinTime.gt(0)) {
        throw new Error('already in alliance');
      }

      let message = `Join Alliance ${hexZeroPad(invite.alliance.toLowerCase(), 20)}`;
      if (allianceData.nonce.gt(0)) {
        message = `Join Alliance ${hexZeroPad(invite.alliance.toLowerCase(), 20)} (nonce: ${(
          '' + allianceData.nonce.toNumber()
        ).padStart(10, ' ')})`;
      }
      console.log({message});
      const signature = await wallet.provider.getSigner().signMessage(message);

      const contract = new Contract(
        invite.alliance,
        $contractsInfos.contracts.BasicAllianceFactory.abi,
        wallet.provider.getSigner()
      );
      await contract.claimInvite($wallet.address, allianceData.nonce, signature, invite.nonce, invite.signature);
    });
  }

  let lastWalletState: WalletData | undefined;
  async function update() {
    if (!invite?.alliance) {
      admin = undefined;
      step = 'READY';
      return;
    }
    if (lastWalletState && lastWalletState.state === 'Ready') {
      if (step != 'READY' || (invite?.alliance && !admin)) {
        step = 'LOADING';
        try {
          const contract = new Contract(
            invite?.alliance,
            $contractsInfos.contracts.BasicAllianceFactory.abi,
            wallet.provider
          );
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

  let error: string | undefined;
  let admin: string | undefined;
  let step: 'LOADING' | 'READY' | 'IDLE' = 'IDLE';

  wallet.subscribe(async (walletState) => {
    lastWalletState = walletState;
    update();
  });

  let isAllianceMember = false;
  $: {
    isAllianceMember = false;
    const data = $playersQuery.data;
    const player = data && data.players[$wallet.address?.toLowerCase()];
    if (player) {
      for (const alliance of player.alliances) {
        if (alliance.address == invite?.alliance.toLowerCase()) {
          isAllianceMember = true;
        }
      }
    }
  }

  $: isAdmin = admin && $wallet.address?.toLowerCase() === admin;
</script>

<!-- <Header /> -->

<WalletAccess>
  <div class="py-16 bg-black overflow-hidden lg:py-24">
    <div class="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
      <div class="m-2">
        {#if $wallet.state !== 'Ready'}
          <!-- <PanelButton on:click={connect} label="Connect">Connect</PanelButton> -->
          <div class="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
            <PanelButton on:click={connect} label="Connect">Connect Your Wallet</PanelButton>
          </div>
        {:else if step === 'LOADING'}
          <p>Loading ...</p>
        {:else if step === 'IDLE'}
          {#if error}
            {error}
          {/if}
          <PanelButton on:click={() => flow.connect()} label="load">load</PanelButton>
        {:else if invite}
          <h2 class="md:text-xl lg-text-2xl text-base text-green-600">Invite to alliance {invite.alliance}</h2>

          {#if invite.player.toLowerCase() !== $wallet.address.toLowerCase()}
            <p class="m-2 text-orange-600">The invite is for {invite.player}</p>
            <p class="m-2 text-orange-600">Switch to this account to continue</p>
          {:else}
            <div>
              <PanelButton on:click={join} label="Join">Join</PanelButton>
            </div>
          {/if}
        {:else}
          <p>No Invite</p>
        {/if}
      </div>
    </div>
  </div>
</WalletAccess>
