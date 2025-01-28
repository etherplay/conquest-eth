<script lang="ts">
  import claimFlow from '$lib/flows/claim';
  import sendFlow from '$lib/flows/send';
  import simulateFlow from '$lib/flows/simulateFlow';
  import exitFlow from '$lib/flows/exit';
  import planetTransferFlow from '$lib/flows/planetTransfer';
  import messageFlow from '$lib/flows/message';
  import showPlanetDepartures from '$lib/flows/showPlanetDepartures';
  import {wallet} from '$lib/blockchain/wallet';
  import Help from '$lib/components/utils/Help.svelte';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {planets} from '$lib/space/planets';
  import {account} from '$lib/account/account';
  import {privateWallet} from '$lib/account/privateWallet';
  import {matchConditions, pluginShowing, showPlanetButtons} from '$lib/plugins/currentPlugin';

  export let coords: {x: number; y: number};
  export let close: () => void;

  $: planetInfo = spaceInfo.getPlanetInfo(coords.x, coords.y);

  $: planetState = planets.planetStateFor(planetInfo);

  function capture() {
    claimFlow.claim(coords);
  }

  function addToCapture() {
    claimFlow.addMore(coords);
  }

  function removeFromCpature() {
    claimFlow.remove(coords);
  }

  function sendTo() {
    sendFlow.sendTo(coords);
    close();
  }

  function sendToInactivePlanet() {
    sendFlow.sendToInactivePlanet(coords);
    close();
  }

  function sendFrom() {
    sendFlow.sendFrom(coords);
    close();
  }

  function cancelSend() {
    sendFlow.cancel();
  }

  function simulateFrom() {
    simulateFlow.simulateFrom(coords);
    close();
  }

  function showSimulation() {
    simulateFlow.simulate(coords);
  }

  function cancelSimulation() {
    simulateFlow.cancel();
  }

  function exitFrom() {
    exitFlow.exitFrom(coords);
    close();
  }

  function transferPlanet() {
    planetTransferFlow.transfer(coords);
    close();
  }

  function messageOwner() {
    messageFlow.show($planetState.owner);
  }

  function showDepartures() {
    showPlanetDepartures.show(planetInfo.location.id);
  }

  function connect() {
    privateWallet.login();
  }

  function showPlugin(src: string) {
    pluginShowing.showPlanet(src, planetState, planetInfo);
  }

  $: walletIsOwner = $wallet.address && $wallet.address?.toLowerCase() === $planetState?.owner?.toLowerCase();
  $: textColor =
    $planetState && $planetState.owner ? (walletIsOwner ? 'text-green-500' : 'text-red-500') : 'text-gray-100';

  $: destinationPlanetInfo =
    $sendFlow.data?.to && spaceInfo.getPlanetInfo($sendFlow.data?.to.x as number, $sendFlow.data?.to.y as number);
  $: destinationPlanetState = $sendFlow.data?.to && planets.planetStateFor(destinationPlanetInfo);

  $: originPlanetInfo =
    $sendFlow.data?.from && spaceInfo.getPlanetInfo($sendFlow.data?.from.x as number, $sendFlow.data?.from.y as number);
  $: originPlanetState = $sendFlow.data?.from && planets.planetStateFor(originPlanetInfo);

  $: attacking =
    $sendFlow.step === 'PICK_ORIGIN' && destinationPlanetState && $destinationPlanetState?.owner !== $wallet.address;

  $: captureResult = undefined; // TODO $planetState ? space.simulateCapture($wallet.address, $planet, $time) : undefined;

  $: extraButtons = $showPlanetButtons.filter(
    (v) =>
      !v.panelConditions ||
      matchConditions(v.panelConditions, {account: $wallet.address, planetState: $planetState, planetInfo})
  );

  $: pickedByClaimFlow =
    $claimFlow.step === 'ADD_MORE' && $claimFlow.data.coords.find((v) => v.x == coords.x && v.y == coords.y);
</script>

{#if $planetState}
  {#if $wallet.address}
    {#if $privateWallet.step !== 'READY'}
      <PanelButton label="Sign-in" class="m-2" on:click={connect}>
        <div class="w-20">Sign-In</div>
      </PanelButton>
    {:else}
      <!-- TODO !walletIsOwner should depend on plugins-->
      {#if ($sendFlow.step !== 'PICK_DESTINATION' && $sendFlow.step !== 'PICK_ORIGIN') || !walletIsOwner}
        {#each extraButtons as button}
          <PanelButton
            label={button.title}
            class="m-2"
            color="text-blue-600"
            borderColor="border-blue-600"
            on:click={() => showPlugin(button.src)}
          >
            <div class="w-20">
              {button.title}
              <Help class="inline w-4 h-4">TODO plugin help ?</Help>
            </div>
          </PanelButton>
        {/each}
      {/if}
      {#if (!$planetState.owner || $planetState.owner === '0x0000000000000000000000000000000000000000') && $planetState.capturing}
        <p>Capturing....</p>
      {:else if $sendFlow.step === 'PICK_DESTINATION'}
        <!-- TAKEN CARE BY VirtualFleetActionPanel -->
        {#if !walletIsOwner}
          <PanelButton
            label="Message"
            color="text-blue-400"
            borderColor="border-blue-400"
            class="m-2"
            on:click={messageOwner}
          >
            <div class="w-20">Message Owner</div>
          </PanelButton>
        {/if}
      {:else if $sendFlow.step === 'PICK_ORIGIN'}
        <!-- TAKEN CARE BY VirtualFleetActionPanel -->
        {#if !walletIsOwner}
          <PanelButton
            label="Message"
            color="text-blue-400"
            borderColor="border-blue-400"
            class="m-2"
            on:click={messageOwner}
          >
            <div class="w-20">Message Owner</div>
          </PanelButton>
        {/if}
      {:else if $simulateFlow.step === 'PICK_DESTINATION'}
        <PanelButton
          label="Show simulation"
          class="m-2"
          color="text-green-500"
          borderColor="border-green-500"
          on:click={showSimulation}
        >
          <div class="w-20">Show Simulation</div>
        </PanelButton>

        <PanelButton label="Cancel" class="m-2" on:click={cancelSimulation}>
          <div class="w-20">Cancel</div>
        </PanelButton>
      {:else if $claimFlow.step === 'ADD_MORE'}
        {#if !$planetState.owner}
          {#if pickedByClaimFlow}
            <PanelButton
              label="Remove"
              class="m-2"
              color="text-yellow-400"
              borderColor="border-yellow-400"
              on:click={removeFromCpature}
            >
              <div class="w-20">Remove</div>
            </PanelButton>
          {:else}
            <PanelButton
              label="Add"
              class="m-2"
              color="text-yellow-400"
              borderColor="border-yellow-400"
              disabled={!$planetState.inReach}
              on:click={addToCapture}
            >
              <div class="w-20">
                Add
                <span class="text-sm">
                  {#if !$planetState.inReach}
                    (unreachable)
                    <Help class="inline w-4 h-4">
                      The Reachable Universe expands as more planets get captured. Note though that you can still send
                      attack unreachable planets. But these planets cannot produce spaceships until they get in range
                      and you stake on it.
                    </Help>
                  {:else}
                    <Help class="inline w-4 h-4">
                      To claim a planet and make it produce spaceships for you, you have to deposit a certain number of
                      <PlayCoin class="w-4 inline" />
                      (Play token) on it. If you lose your planet, you lose the ability to withdraw them.
                      <br />
                      The capture will be resolved as if it was a 10,000 attack power with 100,000
                      <!-- TODO config -->
                      spaceships. The capture will only be succesful if the attack succeed
                    </Help>
                  {/if}
                </span>
              </div>
            </PanelButton>
          {/if}
        {:else}
          <!-- -->
        {/if}
      {:else if !$planetState.owner}
        <PanelButton
          label="Stake"
          class="m-2"
          color="text-yellow-400"
          borderColor="border-yellow-400"
          disabled={!$planetState.inReach}
          on:click={capture}
        >
          <div class="w-20">
            Stake
            <span class="text-sm">
              {#if !$planetState.inReach}
                (unreachable)
                <Help class="inline w-4 h-4">
                  The Reachable Universe expands as more planets get captured. Note though that you can still send
                  attack unreachable planets. But these planets cannot produce spaceships until they get in range and
                  you stake on it.
                </Help>
              {:else}
                <Help class="inline w-4 h-4">
                  To claim a planet and make it produce spaceships for you, you have to deposit a certain number of
                  <PlayCoin class="w-4 inline" />
                  (Play token) on it. If you lose your planet, you lose the ability to withdraw them.
                  <br />
                  The capture will be resolved as if it was a 10,000 attack power with 100,000
                  <!-- TODO config -->
                  spaceships. The capture will only be succesful if the attack succeed
                </Help>
              {/if}
            </span>
          </div>
        </PanelButton>
        {#if $planetState.natives}
          <PanelButton
            color="text-red-500"
            borderColor="border-red-500"
            label="Send Here"
            class="m-2"
            on:click={sendToInactivePlanet}
          >
            <div class="w-20 text-red-500">
              Conquer
              <Help class="inline w-4 h-4">
                You can send out spaceships to inactive planet to get hold of it and prevent other player to stake on
                it. But note that the planet will remain non-active and spaceships population will decrease until it
                reaches zero at which point, it ll be in th ehand of the native population again. You ll need to stake <PlayCoin
                  class="w-4 h-4 inline"
                /> to make it produce spaceships.
              </Help>
            </div>
          </PanelButton>
        {:else}
          <!-- unreachable ? -->
          <PanelButton label="Send Here" class="m-2" on:click={sendTo}>
            <div class="w-20">Send Here</div>
          </PanelButton>
        {/if}
      {:else if walletIsOwner}
        {#if $planetState.exiting}
          <PanelButton label="Send Here" class="m-2" on:click={sendTo}>
            <div class="w-20">Send Here</div>
          </PanelButton>
        {:else if !$planetState.active}
          <PanelButton
            label="Stake"
            class="m-2"
            color="text-yellow-400"
            borderColor="border-yellow-400"
            disabled={!$planetState.inReach}
            on:click={capture}
          >
            <div class="w-20">
              Stake
              <span class="text-sm">
                {!$planetState.inReach ? ' (unreachable)' : ''}
                <Help class="inline w-4 h-4">
                  The Reachable Universe expands as more planets get captured. Note though that you can still send
                  attack unreachable planets. But these planets cannot produce spaceships until they get in range and
                  you stake on it.
                </Help></span
              >
            </div>
          </PanelButton>
          <PanelButton label="Send Here" class="m-2" on:click={sendTo}>
            <div class="w-20">Send Here</div>
          </PanelButton>
          {#if $planetState.numSpaceships > 0}
            <!-- <PanelButton label="Send" class="m-2" on:click={sendFrom}>
            <div class="w-20">Send</div>
          </PanelButton> -->
          {/if}
        {:else}
          <PanelButton label="Send Here" class="m-2" on:click={sendTo}>
            <div class="w-20">Send Here</div>
          </PanelButton>
          <!-- <PanelButton label="Send" class="m-2" on:click={sendFrom}>
          <div class="w-20">Send</div>
        </PanelButton> -->
          <PanelButton
            label="Exit"
            color="text-yellow-400"
            borderColor="border-yellow-400"
            class="m-2"
            on:click={exitFrom}
          >
            <div class="w-20">Exit</div>
          </PanelButton>

          <PanelButton
            label="Transfer"
            color="text-yellow-400"
            borderColor="border-yellow-400"
            class="m-2"
            on:click={transferPlanet}
          >
            <div class="w-20">Transfer</div>
          </PanelButton>
        {/if}
      {:else}
        {#if $planetState.active}
          <PanelButton label="Send" class="m-2" on:click={sendTo}>
            <div class="w-20">
              Send Here
              <Help class="inline w-4 h-4">
                You can send out spaceships in the form of fleets to either attack or send reinforcement.
              </Help>
            </div>
          </PanelButton>
        {:else}
          <PanelButton
            color="text-red-500"
            borderColor="border-red-500"
            label="Send Here"
            class="m-2"
            on:click={sendToInactivePlanet}
          >
            <div class="w-20 text-red-500">
              Conquer
              <Help class="inline w-4 h-4">
                You can send out spaceships to inactive planet to get hold of it and prevent other player to stake on
                it. But note that the planet will remain non-active and spaceships population will decrease until it
                reaches zero at which point, it ll be in th ehand of the native population again. You ll need to stake <PlayCoin
                  class="w-4 h-4 inline"
                /> to make it produce spaceships.
              </Help>
            </div>
          </PanelButton>
        {/if}
        <PanelButton
          label="Message"
          color="text-blue-400"
          borderColor="border-blue-400"
          class="m-2"
          on:click={messageOwner}
        >
          <div class="w-20">Message Owner</div>
        </PanelButton>
      {/if}
      <PanelButton
        label="Simulate"
        color="text-gray-200"
        borderColor="border-gray-200"
        class="m-2"
        on:click={simulateFrom}
      >
        <div class="w-20">Simulate</div>
      </PanelButton>
      <PanelButton
        label="Departures"
        color="text-gray-200"
        borderColor="border-gray-200"
        class="m-2"
        on:click={showDepartures}
      >
        <div class="w-20">Traffic</div>
      </PanelButton>
    {/if}
  {:else}
    <PanelButton label="Connect your wallet" class="m-2" on:click={connect}>
      <div class="w-20">Connect Wallet</div>
    </PanelButton>
  {/if}
{:else}Loading...{/if}
