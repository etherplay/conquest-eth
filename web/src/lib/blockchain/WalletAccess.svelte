<script lang="ts">
  export let title = '';
  import {chainName} from '$lib/config';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import Modal from '$lib/components/generic/Modal.svelte';
  import {base} from '$app/paths';
  import {wallet, builtin, chain, transactions, balance, flow, fallback, switchChain} from '$lib/blockchain/wallet';
  import {privateWallet} from '$lib/account/privateWallet';
  import {formatError} from '$lib/utils';
  import {IAmRunningOnAMobileOrTablet} from '$lib/utils/web';
  import {onMount} from 'svelte';

  $: executionError = $flow.executionError as any;

  let options: {img: string; id: string; name: string}[] = [];
  $: builtinNeedInstalation = $wallet.options.filter((v) => v === 'builtin' && !$builtin.available).length > 0;
  $: options = $wallet.options
    .filter((v) => v !== 'builtin' || $builtin.available)
    .map((v) => {
      return {
        img: ((v) => {
          if (v === 'builtin') {
            if ($builtin.state === 'Ready') {
              if ($builtin.vendor === 'Metamask') {
                return 'images/metamask.svg';
              } else if ($builtin.vendor === 'Opera') {
                return 'images/opera.svg';
              }
            }
            return 'images/web3-default.png';
          } else {
            if (v.startsWith('torus-')) {
              const verifier = v.slice(6);
              return `images/torus/${verifier}.svg`;
            }
            return `images/${v}.svg`;
          }
        })(v),
        id: v,
        name: v,
      };
    });

  let storeSignatureLocally = false;

  let setByUser: string | undefined = undefined;
  let syncRemotely = true;

  $: {
    console.log({syncRemotely, syncEnabled: $privateWallet.syncEnabled, setByUser});
    if (setByUser !== $wallet.address) {
      syncRemotely = $privateWallet.syncEnabled;
    }
  }

  function onSyncCheckBoxChanged(e) {
    setByUser = $wallet.address;
    syncRemotely = e.target.checked;
  }

  function acknowledgeNewGenesis() {
    chain.acknowledgeNewGenesisHash();
  }

  let onSharedStorage = !!(base && (base.startsWith('/ipfs/') || base.startsWith('/ipns/')));

  let encodedLocation = encodeURIComponent('https://2025-1.conquest.game');
  let host = '2025-1.conquest.game';
  onMount(() => {
    encodedLocation = encodeURIComponent(window.location.href);
    host = window.location.host;
  });
</script>

<slot />

<!-- {#if $chain.state === 'Idle' && !$chain.connecting && $fallback.state === 'Idle' && !$fallback.connecting}
  <div class="w-full flex items-center justify-center fixed top-0 pointer-events-none" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">Please Connect.</p>
  </div>
{:else if $chain.state === 'Idle' && !$chain.connecting && $fallback.error} -->
{#if $chain.state === 'Idle' && !$chain.connecting && $fallback.error}
  <div class="w-full flex items-center justify-center fixed top-0 pointer-events-none" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">
      Network Issues, Please Connect.
    </p>
  </div>
{:else if $chain.notSupported}
  <div class="w-full flex items-center justify-center fixed top-0" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">
      Wrong network, switch to
      {chainName}
      <button class="border-2 border-white p-2" on:click={switchChain}>OK</button>
    </p>
  </div>
{:else if $chain.genesisChanged}
  <div class="w-full flex items-center justify-center fixed top-0" style="z-index: 5;">
    <p class="w-64 text-center rounded-bl-xl rounded-br-xl text-gray-200 bg-red-500 p-1">
      chain reset detected! Metamask need to have its account reset! <button
        class="border-2 border-white p-2"
        on:click={acknowledgeNewGenesis}>OK</button
      >
    </p>
  </div>
{/if}

{#if $wallet.error}
  <Modal title="An Error Happened" on:close={() => wallet.acknowledgeError()}>
    <p class="w-64 text-center text-red-500 p-1">
      {$wallet.error.message}
    </p>
  </Modal>
{:else if $chain.error}
  <Modal title="An Error Happened" on:close={() => chain.acknowledgeError()}>
    <p class="w-64 text-center text-red-500 p-1">
      {$chain.error.message}
    </p>
  </Modal>
{:else if $flow.inProgress}
  <Modal
    {title}
    cancelable={!$wallet.connecting}
    on:close={() => {
      privateWallet.cancel(true);
      if (!$wallet.address) {
        wallet.disconnect({logout: true, keepFlow: false});
      }
    }}
    closeButton={false}
  >
    {#if $wallet.state === 'Idle'}
      {#if $wallet.loadingModule}
        Loading module:
        {$wallet.selected}
      {:else if $wallet.connecting}
        Connecting to wallet...
      {:else}
        <!-- <div class="text-center">
          <p>You need to connect your wallet.</p>
        </div> -->
        <div class="flex flex-wrap justify-center pb-3">
          {#each options as option}
            {#if !(option.id === 'builtin' && $builtin.walletsAnnounced.length > 0)}
              <img
                class="cursor-pointer p-2 m-2 border-2 h-12 w-12 object-contain border-cyan-300"
                alt={`Login with ${option.name}`}
                src={`${base}/${option.img}`}
                on:click={() => wallet.connect(option.id)}
              />
            {/if}
          {/each}

          {#if $builtin.walletsAnnounced}
            {#each $builtin.walletsAnnounced as builtinChoice}
              <img
                class="cursor-pointer p-2 m-2 border-2 h-12 w-12 object-contain border-cyan-300"
                alt={`Login with ${builtinChoice.info?.name}`}
                src={builtinChoice.info?.icon}
                on:click={() => {
                  console.log(builtinChoice);
                  wallet.connect(`builtin:${builtinChoice.info.name}`);
                }}
              />
            {/each}
          {/if}
        </div>
        {#if builtinNeedInstalation}
          <!-- <div class="text-center">OR</div> -->

          {#if IAmRunningOnAMobileOrTablet}
            <div class="text-center">Connect via Wallet App</div>
            <div class="flex justify-center flex-col">
              <NavButton
                label="Use Phantom"
                blank={true}
                href={`https://phantom.app/ul/browse/${encodedLocation}?ref=${encodedLocation}`}
                class="m-4 w-max-content"
              >
                <img
                  class="cursor-pointer p-0 m-auto h-10 w-10 object-contain mb-2"
                  alt={`Use Phantom}`}
                  src={`${base}images/phantom.svg`}
                />
                Phantom
              </NavButton>
              <NavButton
                label="Use Metamask"
                blank={true}
                href={`https://metamask.app.link/dapp/${host}`}
                class="m-4 w-max-content"
              >
                <img
                  class="cursor-pointer p-0 m-auto h-10 w-10 object-contain mb-2"
                  alt={`Use Metamask}`}
                  src={`${base}images/metamask.svg`}
                />
                Metamask
              </NavButton>
            </div>
          {:else}
            <div class="text-center">Download a Wallet</div>
            <div class="flex justify-center">
              <NavButton label="Download Rabby Wallet" blank={true} href="https://rabby.io/" class="m-4 w-max-content">
                <img
                  class="cursor-pointer p-0 m-auto h-10 w-10 object-contain mb-2"
                  alt={`Download Rabby Wallet}`}
                  src={`${base}images/rabby.svg`}
                />
                Rabby
              </NavButton>
              <NavButton
                label="Download Phantom"
                blank={true}
                href="https://phantom.com/download"
                class="m-4 w-max-content"
              >
                <img
                  class="cursor-pointer p-0 m-auto h-10 w-10 object-contain mb-2"
                  alt={`Download Phantom}`}
                  src={`${base}images/phantom.svg`}
                />
                Phantom
              </NavButton>
              <NavButton
                label="Download Metamask"
                blank={true}
                href="https://metamask.io/download.html"
                class="m-4 w-max-content"
              >
                <img
                  class="cursor-pointer p-0 m-auto h-10 w-10 object-contain mb-2"
                  alt={`Download Metamask}`}
                  src={`${base}images/metamask.svg`}
                />
                Metamask
              </NavButton>
            </div>
          {/if}
        {/if}
      {/if}
    {:else if $wallet.state === 'Locked'}
      {#if $wallet.unlocking}
        Please accept the application to access your wallet.
      {:else}
        <Button class="mt-4" label="Unlock Wallet" on:click={() => wallet.unlock()}>Unlock</Button>
      {/if}
    {:else if $chain.state === 'Idle'}
      {#if $chain.connecting}
        Connecting to chain...
      {:else if $chain.error}
        <div class="text-center">
          <p>{$chain.error?.message || '' + $chain.error}</p>
          <Button class="mt-4" label="OK" on:click={() => flow.cancel()}>OK</Button>
        </div>
      {/if}
    {:else if $chain.state === 'Connected'}
      {#if $chain.loadingData}
        Loading contracts...
      {:else if $chain.notSupported}
        Please switch to
        {chainName}
        <!-- ({$chain.chainId}) -->
        <div>
          <Button label="Unlock Wallet" on:click={switchChain}>Switch</Button>
        </div>
      {/if}
    {:else if executionError}
      <div class="text-center">
        <p>
          {#if executionError.code === 4001}
            You rejected the request
          {:else}{formatError(executionError)}{/if}
        </p>
        <Button class="mt-4" label="Retry" on:click={() => flow.retry()}>Retry</Button>
      </div>
    {:else if $privateWallet.step === 'SIGNATURE_REQUESTED'}
      Please accept the signature to unlock your account.
    {:else if $wallet.pendingUserConfirmation}
      {#if $wallet.pendingUserConfirmation[0] === 'transaction'}
        Please accept transaction...
      {:else if $wallet.pendingUserConfirmation[0] === 'signature'}
        Please accept signature...
      {:else}Please accept request...{/if}
    {:else if $privateWallet.step === 'SIGNATURE_REQUIRED'}
      <div class="text-center">
        <p>
          conquest.eth require your signature to operate. Do not sign this message outside of conquest.eth or other
          trusted frontend!
        </p>
        <!-- TODO store and then auto connect if present -->
        <div class="ml-8 mt-6 text-cyan-100 text-xs">
          <label class="flex items-center">
            <input
              type="checkbox"
              class="form-checkbox"
              bind:checked={storeSignatureLocally}
              disabled={onSharedStorage}
            />
            {#if onSharedStorage}
              <span class="ml-2 text-gray-500"
                >Do not ask again. (option disabled as app is served from shared host)</span
              >
            {:else}<span class="ml-2">Do not ask again. (trust computer and {window.location.host})</span>{/if}
          </label>
          <label class="flex items-center">
            <input type="checkbox" class="form-checkbox" checked={syncRemotely} on:change={onSyncCheckBoxChanged} />
            <span class="ml-2">enable encrypted sync across devices</span>
          </label>
        </div>
        <Button label="sign" class="mt-5" on:click={() => privateWallet.confirm({storeSignatureLocally, syncRemotely})}>
          sign
        </Button>
      </div>
    {:else if $privateWallet.step === 'READY'}
      <p>...</p>
      <!-- <div class="text-center">
        <p>Connection Aborted</p>
        <p>chain: {$chain.state}</p>
        <p>wallet: {$wallet.state}</p>
        <p>flow: {$flow.inProgress}</p>
        <Button class="mt-4" label="Retry" on:click={() => privateWallet.cancel()}>OK</Button>
      </div> -->
    {:else}
      <div class="text-center">
        <p>Flow aborted {$privateWallet.step}</p>
        <Button class="mt-4" label="Cancel" on:click={() => privateWallet.cancel()}>OK</Button>
      </div>
    {/if}
  </Modal>
{:else if $privateWallet.step === 'CONNECTING'}
  <Modal>
    <p>Connecting to wallet....</p>
  </Modal>
{/if}
