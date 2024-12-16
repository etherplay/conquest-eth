<script lang="ts">
  import Button from '$lib/components/generic/PanelButton.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import {wallet, builtin, flow, balance} from '$lib/blockchain/wallet';
  import Help from '$lib/components/utils/Help.svelte';
  import PendingFleetElement from '$lib/components/fleets/PendingFleetElement.svelte';
  import {base} from '$app/paths';
  import {privateWallet} from '$lib/account/privateWallet';

  import {agentService} from '$lib/account/agentService';
  import {defaultTopupValueInEth, nativeTokenSymbol} from '$lib/config';
  import agentService_register from '$lib/flows/agentService_register';
  import agentService_topup from '$lib/flows/agentService_topup';
  import {BigNumber} from '@ethersproject/bignumber';
  import {formatEther, parseEther} from '@ethersproject/units';
  import {account} from '$lib/account/account';
  import {fleetList} from '$lib/space/fleets';
  import {onMount} from 'svelte';
  import agentService_withdraw from '$lib/flows/agentService_withdraw';

  $: registered = $agentService.account && $agentService.account.delegate;
  $: enoughBalance = registered && $agentService.account.balance.gte($agentService.account.minimumBalance);

  $: minimumBalance = $agentService.account
    ? BigNumber.from($agentService.account?.minimumBalance)
    : parseEther('0.01');
  let topupValueInEth;
  onMount(() => {
    topupValueInEth = defaultTopupValueInEth;
  });
</script>

<div class="w-full h-full bg-black">
  <NavButton class="absolute" label="Back To Game" href={`${base}/`}>
    <!-- blank={true} -->
    Go To Game
  </NavButton>
  <WalletAccess>
    <div class="flex justify-center flex-wrap text-cyan-300">
      <h1 class="text-4xl m-4 mt-10">
        conquest.eth agent service
        <Help class="w-4 h-4">
          The agent service is provided by Etherplay to help your fleets being resolved in time. In order to work, the
          service need to be paid for. Please top-up to ensure your fleet are resolved.
        </Help>
      </h1>
    </div>
    {#if $privateWallet.step === 'READY'}
      <div class="flex flex-col text-center justify-center text-red-500 mb-8">
        <p>
          The agent service is provided by Etherplay to help your fleets being resolved in time. In order to work, the
          service need to be paid for. Please top-up to ensure your fleet are resolved.
        </p>
        <p>
          Note that we cannot guarantee that fleets will be resolved and this service is purely optional. You can always
          resolve your fleet manually. We will do our best to broadcast the transaction in time.
        </p>
        <p>
          We will also do our best to keep your fleet destination private and we will never read the data, except for
          debugging purpose but with no intent to use that information in game.
        </p>
      </div>
    {/if}
    <div class="flex justify-center flex-wrap text-cyan-300">
      <div class="w-full justify-center text-center">
        {#if $privateWallet.step !== 'READY'}
          {#if $privateWallet.step === 'CONNECTING'}
            <p>Connecting...</p>
          {:else}
            <Button
              class="w-max-content m-4"
              label="connect"
              disabled={!$builtin.available || $wallet.connecting}
              on:click={() => privateWallet.login()}
            >
              Connect
            </Button>
          {/if}
          <!-- {:else if $agent.state === 'Loading' || !$agent.balance}
          <p>Loading...</p> -->
        {:else if $agentService.state === 'Loading'}
          Loading...
        {:else}
          <!-- <p>Agent Service Payment Address: {contractsInfos.contracts.PaymentGateway.address}</p> -->

          {#if !registered}
            <!-- {JSON.stringify($agentService.account)} -->
            You need to register
            <Button
              class="w-max-content m-4"
              label="register"
              on:click={() => agentService_register.register($privateWallet.signer.address)}>Register</Button
            >
          {:else}
            {#if enoughBalance}
              {#if !$account.data?.agentServiceDefault?.activated}
                <p>Agent is not active by default, it will require manual submission</p>
                <Button
                  class="w-max-content m-4"
                  label="activate"
                  on:click={() => account.recordAgentServiceDefault(true)}>Activate?</Button
                >
              {:else}
                <p>Agent service is active by default</p>
                <Button
                  class="w-max-content m-4"
                  label="activate"
                  on:click={() => account.recordAgentServiceDefault(false)}>Deactivate?</Button
                >
              {/if}
            {:else}
              <p>
                You do not have enough balance. You need at least {formatEther(minimumBalance)} ${nativeTokenSymbol}
              </p>

              <p>please top-up</p>
            {/if}

            <p>
              Your Balance:
              {formatEther($agentService.account.balance)}
              ${nativeTokenSymbol}
              <!-- (arround
                {$agent.balance.div($agent?.cost || 0)}
                fleet) -->

              <Button
                class="w-max-content mt-4 mx-4"
                label="Top Up"
                on:click={() => agentService_topup.topup(parseEther('' + topupValueInEth))}
              >
                Top Up ({topupValueInEth})
                <!-- Top Up (for 10 fleets) -->
              </Button>
            </p>
            <p class="text-xs">You can adjust the amount here</p>
            <p>
              <input class="bg-gray-800 text-xs" step="0.1" type="number" bind:value={topupValueInEth} />
            </p>
          {/if}

          <p class="mb-4">
            {#if $agentService.account?.balance.gt(0)}
              <Button
                class="w-max-content mt-4 mx-4"
                color="text-red-300"
                cornerColor="border-red-300"
                label="Withdraw"
                on:click={() => agentService_withdraw.withdraw()}
              >
                Withdraw All
              </Button>
            {/if}
          </p>

          <!-- {#if $agentService.lowETH}
                <p class="text-red-500">The agent need to be topped up to perform the fleet resolution</p>
                <Button
                  class="w-max-content m-4"
                  label="Top Up"
                  on:click={() => agentService.topup()}>
                  Top Up
                </Button>
              {:else if $pendingActions && $pendingActions.length > 0}
              {#if loading}
                Loading...
              {:else if $pendingActions && $pendingActions.length > 0}
                Here is a list of the fleets
                <ul class="list-disc text-yellow-600">
                  {#each $pendingActions as pendingAction}
                    {#if pendingAction.action.type === 'SEND' && pendingAction.status !== 'FAILURE' && pendingAction.status !== 'LOADING' && pendingAction.status !== 'CANCELED' && pendingAction.status !== 'TIMEOUT'}
                      <li><PendingFleetElement {pendingAction} /></li>
                    {/if}
                  {/each}
                </ul>
              {:else}
                <p>No Fleet yet</p>
              {/if} -->

          <ul class="list-disc text-yellow-600">
            {#each $fleetList.fleets as fleet (fleet.txHash)}
              <li><PendingFleetElement {fleet} actionAvailable={registered && enoughBalance} /></li>
            {:else}
              No Fleets
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </WalletAccess>
</div>

<!-- <script lang="ts">
  import {base} from '$app/paths';
  import type {CheckedPendingAction} from '$lib/account/pendingActions';
  import {pendingActions} from '$lib/account/pendingActions';
  import {privateWallet} from '$lib/account/privateWallet';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import PendingFleetElement from '$lib/components/fleets/PendingFleetElement.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import FleetElement from '$lib/screens/map/FleetElement.svelte';
  import {fleetList} from '$lib/space/fleets';
  import {onMount} from 'svelte';

  onMount(() => {
    // privateWallet.login();
  });
</script>

<WalletAccess>
  <div class="w-full h-full bg-black text-white">
    <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>

    {$fleetList.fleets.length}

    {#if $fleetList.fleets}
      {#each $fleets as fleet}
        {#if fleet.state !== 'WAITING_ACKNOWLEDGMENT'}
          {fleet.txHash}
        {/if}
      {/each}
    {/if}

    <div>
      {#each $pendingActions as pendingAction}
        {#if pendingAction.action.type === 'SEND' && pendingAction.status !== 'FAILURE' && pendingAction.status !== 'LOADING' && pendingAction.status !== 'CANCELED' && pendingAction.status !== 'TIMEOUT'}
          <PendingFleetElement {pendingAction} />
        {/if}
      {/each}
    </div>
  </div>
</WalletAccess> -->
