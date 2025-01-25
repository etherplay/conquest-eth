<script lang="ts">
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import {wallet} from '$lib/blockchain/wallet';
  import {myTokens} from '$lib/space/token';
  import {privateWallet} from '$lib/account/privateWallet';
  import Blockie from '$lib/components/account/Blockie.svelte';
  import Help from '$lib/components/utils/Help.svelte';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {url} from '$lib/utils/url';
  import {account} from '$lib/account/account';
  import {nativeTokenSymbol, params, version} from '$lib/config';

  async function connect() {
    try {
      await privateWallet.login();
    } catch (e) {
      if (e.message.indexOf('Cancel') === -1) {
        throw e;
      }
    }
  }
  function disconnect() {
    wallet.disconnect();
  }
  let menu = false;

  let showErrorButton = params['errorButton'];
</script>

<svelte:window on:click={() => (menu = false)} />

{#if $wallet.address}
  {#if !($privateWallet.step === 'READY')}
    <div class="absolute right-0 top-16 bg-gray-900 bg-opacity-80 z-10">
      <PanelButton class="m-1" label="Connect" on:click={connect}>
        Sign In
        <Help class="w-4 h-4">
          By signing in, you ll be able to send spaceships and see your travelling fleets (if any).
        </Help>
      </PanelButton>
    </div>
  {/if}

  <div on:click={(e) => e.stopPropagation()} class="absolute right-0 bg-gray-900 bg-opacity-80 z-10 overflow-hidden">
    <div class="flex items-center">
      {#if $myTokens.playTokenBalance}
        <span class="text-yellow-300 font-black pr-4">
          {'' + $myTokens.playTokenBalance.div('10000000000000000').toNumber() / 100 + ''}
          <PlayCoin class="inline w-4" />
        </span>
        {#if $myTokens.freePlayTokenBalance.gt(0)}
          <span class="text-green-300 font-black pr-4">
            {'' + $myTokens.freePlayTokenBalance.div('10000000000000000').toNumber() / 100 + ''}
            <PlayCoin class="inline w-4" free={true} />
          </span>
        {/if}
        {#if $myTokens.freePlayTokenClaimBalance.gt(0)}
          <a href={url('free-token-claim/')} class="text-green-300 font-black pr-4 animate-bounce">
            {'+' + $myTokens.freePlayTokenClaimBalance.div('10000000000000000').toNumber() / 100 + ''}
            <PlayCoin class="inline w-4" free={true} />
          </a>
        {/if}
      {:else}
        <span class="text-yellow-300 font-black pr-4">
          ...
          <PlayCoin class="inline w-4" />
        </span>
      {/if}
      <span class="inline-block align-middle" on:click={() => (menu = !menu)}>
        <Blockie copiable={false} class="w-10 h-10 m-1" address={$wallet.address} />
      </span>
    </div>
  </div>
  <div class="bg-cyan-500 absolute right-0 top-12 w-20 h-1 m-0" />
  <div class="bg-cyan-700 absolute right-9 top-12 w-14 h-1 m-0" />
  <div class="bg-cyan-900 absolute right-20 top-12 w-10 h-1 m-0" />
  {#if menu}
    <!-- <div
        class="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
        <div
          class="py-1"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"> -->

    <!-- <a
            href="#"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            role="menuitem">Account settings</a>
          <a
            href="#"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            role="menuitem">Support</a>
          <a
            href="#"
            class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            role="menuitem">License</a>
          <form method="POST" action="#">
            <button
              type="submit"
              class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:bg-gray-100 focus:text-gray-900"
              role="menuitem">
              Sign out
            </button>
          </form> -->
    <!-- </div>
      </div> -->
    <div
      class="absolute z-10 right-0 top-14 border-cyan-500 border-2 p-5 bg-opacity-80 bg-black flex mr-2 flex-col items-center"
    >
      <NavButton class="m-1" label="withdrawals" href={url('withdrawals/')}>
        Withdrawals
        <Help class="w-4 h-4">
          Here you'll be able to withdraw the
          <PlayCoin class="w-4 h-4 inline" />
          you earned after exiting your planets.
        </Help>
      </NavButton>
      <NavButton class="m-1" label="agent-service" href={url('agent-service/')}>
        <!-- blank={true} -->
        Agent Service
        <Help class="w-4 h-4">The agent can help you ensure you resolve your fleets in time.</Help>
      </NavButton>
      <NavButton class="m-1" label="help" href={url('logs/')}>
        Logs
        <Help class="w-4 h-4">See Global Logs</Help>
      </NavButton>
      <!-- <NavButton class="m-1" label="help" href={url('highscores/')}>
        Highscores
        <Help class="w-4 h-4">See Highscores for current alpha</Help>
      </NavButton> -->
      <NavButton class="m-1" label="help" href={url('alliances/')}>
        Alliances
        <Help class="w-4 h-4">See All Public Alliances</Help>
      </NavButton>
      <NavButton class="m-1" label="help" href={url('help/')}>
        Help
        <Help class="w-4 h-4">See some Help on the game.</Help>
      </NavButton>
      <NavButton class="m-1" label="settings" href={url('settings/')}>
        Profile
        <Help class="w-4 h-4">You can setup your profile so that other player can contact you.</Help>
      </NavButton>
      <NavButton class="m-1" label="settings" href={url('plugins/')}>
        Plugins
        <Help class="w-4 h-4">Manage Plugins</Help>
      </NavButton>
      <NavButton class="m-1" label="cashout" href={url('cashout/')}>
        Cash Out
        <Help class="w-4 h-4">
          Here you'll be able to cash the
          <PlayCoin class="w-4 h-4 inline" /> out into {nativeTokenSymbol}
        </Help>
      </NavButton>
      <NavButton class="m-1" label="stats" href={url('stats/')}>
        Stats
        <Help class="w-4 h-4">Show Stats</Help>
      </NavButton>
      {#if showErrorButton}
        <NavButton class="m-1" label="settings" on:click={() => account.generateError()}>
          Error
          <Help class="w-4 h-4">Generate an Error to test error report.</Help>
        </NavButton>
      {/if}
      <PanelButton class="m-1" label="Disconnect" on:click={disconnect}>Disconnect</PanelButton>
      <p class="mt-2">version: {version}</p>
    </div>
  {/if}
{:else}
  <div class="absolute right-0 bg-gray-900 bg-opacity-80 z-10">
    <PanelButton class="m-1" label="Connect" on:click={connect}>
      Connect
      <!--  TODO ?<Help inverted={true} class="w-4 h-4">
      Hello d
      <span class="text-red-500">s dsads ad</span>sdas dWorld!
    </Help> -->
    </PanelButton>
  </div>
{/if}
