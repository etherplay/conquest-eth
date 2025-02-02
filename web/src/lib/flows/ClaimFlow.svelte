<script lang="ts">
  import claimFlow, {computeStakingTokenDistribution} from '$lib/flows/claim';
  import Modal from '$lib/components/generic/Modal.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {planets} from '$lib/space/planets';
  import {wallet} from '$lib/blockchain/wallet';
  // TODO use myTokens ?
  import {myTokens} from '$lib/space/token';
  import {BigNumber} from '@ethersproject/bignumber';
  import PlayCoin from '$lib/components/utils/PlayCoin.svelte';
  import {formatError, timeToText} from '$lib/utils';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import {base} from '$app/paths';
  import mintFlow from '$lib/flows/mint';
  import EmbeddedMintFlow from './EmbeddedMintFlow.svelte';
  import {nativeTokenSymbol} from '$lib/config';
  import {initialContractsInfos} from '$lib/blockchain/contracts';
  import MultiplePlanetClaimPanel from '$lib/components/planets/MultiplePlanetClaimPanel.svelte';
  import Help from '$lib/components/utils/Help.svelte';
  import {spaceQuery} from '$lib/space/spaceQuery';
  import {formatEther} from '@ethersproject/units';

  $: coords = $claimFlow.data?.coords;
  $: planetInfo = coords ? spaceInfo.getPlanetInfo(coords[0].x, coords[0].y) : undefined;
  $: planetState = planetInfo ? planets.planetStateFor(planetInfo) : undefined;
  $: stats = planetInfo ? planetInfo.stats : undefined;
  $: stake = stats && stats.stake / 10000;
  $: cost = stats ? BigNumber.from(stats.stake) : undefined; // TODO multiplier from config/contract

  $: result =
    planetInfo && $planetState ? spaceInfo.simulateCapture($wallet.address, planetInfo, $planetState) : undefined;

  function nativeTokenAmountFor(tokenAmountIn10000: BigNumber) {
    return (
      BigNumber.from(tokenAmountIn10000)
        .mul('1000000000000000000000')
        .div(initialContractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals)
        .toNumber() / 10000000
    );
  }

  async function mint(numTokenUnit: number) {
    mintFlow.mint(numTokenUnit);
  }

  let tokenAmountToMint = $mintFlow.data?.numTokenUnit;
  $: if ($mintFlow.data?.numTokenUnit && !tokenAmountToMint) {
    tokenAmountToMint = $mintFlow.data?.numTokenUnit;
  }

  // function onTokenAmountToMintChanged(event: Event) {
  //   const value = parseInt(event.target.value);
  //   if (!isNaN(value)) {
  //     mintFlow.setAmount(value);
  //   }
  // }

  $: YakuzaContract = (initialContractsInfos as any).contracts.Yakuza;

  $: giveToYakuza = $claimFlow.yakuza;

  $: requireBiggerPlanetForYakuza =
    giveToYakuza && BigNumber.from(YakuzaContract.linkedData.minAverageStakePerPlanet).gt(cost.mul('100000000000000'));

  $: distribution = $claimFlow.yakuza
    ? computeStakingTokenDistribution(
        cost.mul('100000000000000'),
        $myTokens.playTokenBalance,
        $spaceQuery.data?.yakuza?.playTokenBalance || BigNumber.from(0)
      )
    : computeStakingTokenDistribution(cost.mul('100000000000000'), $myTokens.playTokenBalance);
</script>

{#if $mintFlow.step !== 'IDLE' && $mintFlow.step !== 'SUCCESS'}
  <EmbeddedMintFlow />
{:else if $claimFlow.error}
  <Modal on:close={() => claimFlow.acknownledgeError()}>
    <div class="text-center">
      <h2>An error happenned For Planet Staking</h2>
      <p class="text-red-500 mt-2 text-sm">{formatError($claimFlow.error)}</p>
      <Button class="mt-5" label="Stake" on:click={() => claimFlow.acknownledgeError()}>Ok</Button>
    </div>
  </Modal>
{:else if $claimFlow.cancelingConfirmation}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    on:close={() => claimFlow.cancelCancelation()}
    on:confirm={() => claimFlow.cancel()}
  >
    <div class="text-center">
      <p class="pb-4">Are you sure to cancel ?</p>
      <p class="pb-4">(This will prevent the game to record your transaction, if you were to execute it afterward)</p>
      <Button label="OK" on:click={() => claimFlow.cancel()}>Yes</Button>
    </div>
  </Modal>
{:else if $claimFlow.step === 'CONNECTING'}
  <!---->
{:else if $claimFlow.step === 'ADD_MORE'}
  <MultiplePlanetClaimPanel />
{:else if $claimFlow.step === 'NOT_ENOUGH_NATIVE_TOKEN'}
  <Modal on:close={() => claimFlow.cancel()}>
    <div class="flex flex-col justify-center items-center">
      <div class="mb-8 text-center">
        You don't have enough {nativeTokenSymbol}, the crypto currency required to perform action on the network.
      </div>
      <!-- <div class="m-2">
        <Button
          href="https://app.ramp.network?hostApiKey=your_host_apiKey&hostAppName=Conquest.eth&hostLogoUrl=https://conquest.game/maskable_icon_512x512.png&userAddress={wallet.address}"
          target="_blank"
          >Purchase XDAI
        </Button>
      </div> -->
      <!-- https://www.mtpelerin.com/buy-crypto  -->
      <div class="m-2">
        <Button href="https://ramp.network/buy" target="_blank">Purchase XDAI</Button>
      </div>
      <div class="m-2">
        <Button href="https://bridge.gnosischain.com/" target="_blank">Or Bridge Some</Button>
      </div>

      <div class="m-2">
        <Button href="https://docs.gnosischain.com/about/third-parties" target="_blank">More Options...</Button>
      </div>
      <div>
        <Button class="mt-5" label="Allow" on:click={() => claimFlow.continueAfterOnRamp()}>Go Back</Button>
      </div>
    </div>
  </Modal>
{:else if $claimFlow.step === 'REQUIRE_ALLOWANCE'}
  <Modal on:close={() => claimFlow.cancel()}
    >You ll need to allow Conquest to transfer your token
    {#if $claimFlow.yakuza}
      <Button class="mt-5" label="Allow" on:click={() => claimFlow.allowYakuzaToTransferToken()}>Allow Yakuza</Button>
    {:else}
      <Button class="mt-5" label="Allow" on:click={() => claimFlow.allowConquestToTransferToken()}>Allow</Button>
    {/if}
  </Modal>
{:else if $claimFlow.step === 'SETTING_ALLOWANCE'}
  <Modal on:close={() => claimFlow.cancel()}>Please confirm...</Modal>
{:else if $claimFlow.step === 'CHECKING_ALLOWANCE'}
  <Modal on:close={() => claimFlow.cancel()}>Please wait...</Modal>
{:else if $claimFlow.step === 'CHOOSE_STAKE' && $wallet.state == 'Ready'}
  <Modal on:close={() => claimFlow.cancel()}>
    {#if !$myTokens.playTokenBalance}
      Please wait...
    {:else if giveToYakuza && YakuzaContract}
      <div class="text-center">
        <h2 class="text-red-500">
          Give the planet <span class="text-green-500">"{stats.name}"</span> (worth ${nativeTokenAmountFor(cost)}) to
          Yakuza in exchange for
          {timeToText(cost.mul(YakuzaContract.linkedData.numSecondsPerTokens).toNumber(), {verbose: true})} of protection
        </h2>
        {#if distribution.amountToMint.gt(0) && distribution.tokenAvailable.gt(0) && distribution.yakuzaTokenAvailable.gt(0)}
          <p class="text-yellow-500 mt-4">
            You'll spend {formatEther(distribution.amountToMint)}
            {nativeTokenSymbol},
            {formatEther(distribution.tokenAvailable)}
            <PlayCoin class="inline w-4" /> and Yakuza provide {formatEther(distribution.yakuzaTokenAvailable)}
            <PlayCoin class="inline w-4" />
          </p>
        {:else if distribution.amountToMint.eq(0) && distribution.tokenAvailable.gt(0) && distribution.yakuzaTokenAvailable.gt(0)}
          <p class="text-yellow-500 mt-4">
            You'll spend
            {formatEther(distribution.tokenAvailable)}
            <PlayCoin class="inline w-4" /> and Yakuza provide {formatEther(distribution.yakuzaTokenAvailable)}
            <PlayCoin class="inline w-4" />
          </p>
        {:else if distribution.amountToMint.eq(0) && distribution.tokenAvailable.eq(0) && distribution.yakuzaTokenAvailable.gt(0)}
          <p class="text-yellow-500 mt-4">
            Yakuza provide all
            <PlayCoin class="inline w-4" />
          </p>
        {:else if distribution.amountToMint.gt(0) && distribution.tokenAvailable.eq(0) && distribution.yakuzaTokenAvailable.gt(0)}
          <p class="text-yellow-500 mt-4">
            You'll spend {formatEther(distribution.amountToMint)}
            {nativeTokenSymbol} and Yakuza provide {formatEther(distribution.yakuzaTokenAvailable)}
            <PlayCoin class="inline w-4" />
          </p>
        {:else if distribution.amountToMint.gt(0) && distribution.tokenAvailable.eq(0) && distribution.yakuzaTokenAvailable.eq(0)}
          <p class="text-yellow-500 mt-4">
            You'll spend {formatEther(distribution.amountToMint)}
            {nativeTokenSymbol}
          </p>
        {:else if distribution.amountToMint.eq(0) && distribution.tokenAvailable.gt(0) && distribution.yakuzaTokenAvailable.eq(0)}
          <p class="text-yellow-500 mt-4">
            You'll spend
            {formatEther(distribution.tokenAvailable)}
            <PlayCoin class="inline w-4" />
          </p>
        {/if}
        <p class="text-gray-300 mt-2 text-sm">
          You'll be able to claim revenge when other players capture any of your planet as long as the subscription does
          not expire
        </p>

        {#if requireBiggerPlanetForYakuza}
          <p class="text-yellow-500 mt-4">
            Yakuza only accept planets in average worth at least {formatEther(
              YakuzaContract.linkedData.minAverageStakePerPlanet
            )}
            <PlayCoin class="inline w-4" />
          </p>
        {/if}

        <Button class="mt-5" label="Add More Planet" on:click={() => claimFlow.askForMore()}>Add More</Button>
        <Button
          disabled={requireBiggerPlanetForYakuza}
          class="mt-5"
          label="Stake"
          on:click={() => {
            claimFlow.confirm(distribution);
          }}>Confirm</Button
        >
        {#if YakuzaContract}
          <label class="flex items-center mt-2">
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
    {:else if $myTokens.playTokenBalance.eq(0) && $myTokens.freePlayTokenBalance.eq(0)}
      <!-- You do not have any
      <PlayCoin class="inline w-4" />. You need
      {cost.toNumber() / 10000}
      <PlayCoin class="inline w-4" />.
      <p class="mt-4 text-yellow-600">
        You can mint some by depositing {nativeTokenSymbol} And you can always burn them then to get back the {nativeTokenSymbol}.
        As long as you hold them or withdraw from the game.
        <center class="m-5">
          <Button label="mint" on:click={() => mint(cost.toNumber() / 10000)}
            >Mint {cost.toNumber() / 10000} <PlayCoin class="inline w-4" /></Button
          >
        </center>
      </p> -->
      <div class="text-center">
        <h2>
          Stake (${nativeTokenAmountFor(cost)}) to activate Planet
          <span class="text-green-500">"{stats.name}"</span>.
        </h2>
        <p class="text-gray-300 mt-2 text-sm">
          You'll be able to get the <span class="text-yellow-500"
            >{stake}
            <PlayCoin class="inline w-4" />
          </span>
          stake <span class="text-sm">(convertible to ${nativeTokenAmountFor(cost)})</span> back if you manage to exit
          the planet safely (this takes
          {timeToText(spaceInfo.exitDuration, {verbose: true})}).
        </p>
        <p class="text-blue-400 mt-2 text-sm">
          Once the tx will be mined, the planet will start with
          {result && result.numSpaceshipsLeft}
          spaceships and will produce
          {stats.production / 60}
          spaceships per minutes.
        </p>
        <Button class="mt-5" label="Add More Planet" on:click={() => claimFlow.askForMore()}>Add More</Button>
        <Button
          class="mt-5"
          label="Stake"
          on:click={() =>
            claimFlow.confirm({amountToMint: cost.mul('100000000000000'), tokenAvailable: BigNumber.from(0)})}
          >Confirm</Button
        >

        {#if YakuzaContract}
          <label class="flex items-center mt-2">
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
    {:else if $myTokens.freePlayTokenBalance.lt(cost.mul('100000000000000')) && $myTokens.playTokenBalance.lt(cost.mul('100000000000000'))}
      <!-- Not enough
      <PlayCoin class="inline w-4" />. You need
      <span class="text-yellow-400">{cost.toNumber() / 10000}</span>
      <PlayCoin class="inline w-4" />
      but you have only
      <span class="text-yellow-400"
        >{$myTokens.playTokenBalance.div('1000000000000000000').toString()} <PlayCoin class="inline w-4" /></span
      >
      {#if $myTokens.freePlayTokenBalance.gt(0)}
        and
        <span class="text-green-400"
          >{$myTokens.freePlayTokenBalance.div('1000000000000000000').toString()}
          <PlayCoin class="inline w-4" free={true} /></span
        >
      {/if}

      <p class="mt-4 text-yellow-600">
        You can mint some by depositing {nativeTokenSymbol} And you can always burn them then to get back the {nativeTokenSymbol}.
        As long as you hold them or withdraw from the game.
        <center class="m-5">
          <Button label="mint" on:click={() => mint(cost.toNumber() / 10000)}
            >Mint {cost.toNumber() / 10000} <PlayCoin class="inline w-4" /></Button
          >
        </center>
      </p> -->
      <div class="text-center">
        <h2>
          Stake
          <span class="text-yellow-500"
            >{$myTokens.playTokenBalance.div('100000000000000').toNumber() / 10000}
            <PlayCoin class="inline w-4" /></span
          >
          + ${nativeTokenAmountFor(cost.mul('100000000000000').sub($myTokens.playTokenBalance).div('100000000000000'))}
          to activate Planet
          <span class="text-green-500">"{stats.name}"</span>.
        </h2>
        <p class="text-gray-300 mt-2 text-sm">
          You'll be able to get the <span class="text-yellow-500"
            >{stake}
            <PlayCoin class="inline w-4" />
          </span>
          stake <span class="text-sm">(convertible to ${nativeTokenAmountFor(cost)})</span> back if you manage to exit
          the planet safely (this takes
          {timeToText(spaceInfo.exitDuration, {verbose: true})}).
        </p>
        <p class="text-blue-400 mt-2 text-sm">
          Once the tx will be mined, the planet will start with
          {result && result.numSpaceshipsLeft}
          spaceships and will produce
          {stats.production / 60}
          spaceships per minutes.
        </p>
        <Button class="mt-5" label="Add More Planet" on:click={() => claimFlow.askForMore()}>Add More</Button>
        <Button
          class="mt-5"
          label="Stake"
          on:click={() =>
            claimFlow.confirm({
              amountToMint: cost.mul('100000000000000').sub($myTokens.playTokenBalance),
              tokenAvailable: $myTokens.playTokenBalance,
            })}>Confirm</Button
        >

        {#if YakuzaContract}
          <label class="flex items-center mt-2">
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
    {:else}
      <div class="text-center">
        <h2>
          Stake
          {#if $myTokens.freePlayTokenBalance.lt(cost.mul('100000000000000'))}
            <span class="text-yellow-500"
              >{stake}
              <PlayCoin class="inline w-4" /></span
            >
          {:else}
            <span class="text-green-500"
              >{stake}
              <PlayCoin class="inline w-4" free={true} /></span
            >
          {/if}

          to activate Planet
          <span class="text-green-500">"{stats.name}"</span>.
        </h2>
        <p class="text-gray-300 mt-2 text-sm">
          You'll be able to get your stake back if you manage to exit the planet safely (this takes
          {timeToText(spaceInfo.exitDuration, {verbose: true})}).
        </p>
        <p class="text-blue-400 mt-2 text-sm">
          Once the tx will be mined, the planet will start with
          {result && result.numSpaceshipsLeft}
          spaceships and will produce
          {stats.production / 60}
          spaceships per minutes.
        </p>
        <Button class="mt-5" label="Add More Planet" on:click={() => claimFlow.askForMore()}>Add More</Button>
        <Button class="mt-5" label="Stake" on:click={() => claimFlow.confirm()}>Confirm</Button>

        {#if YakuzaContract}
          <label class="flex items-center mt-2">
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
    {/if}
  </Modal>
{:else if $claimFlow.step === 'CREATING_TX'}
  <!-- {@debug $claimFlow} -->
  <Modal>Preparing the Transaction...</Modal>
{:else if $claimFlow.step === 'WAITING_TX'}
  <Modal
    closeButton={true}
    globalCloseButton={true}
    closeOnOutsideClick={false}
    on:close={() => claimFlow.cancel(true)}
  >
    Please Accept the Transaction...
  </Modal>
{:else if $claimFlow.step === 'PROFILE_INFO'}
  <Modal on:close={() => claimFlow.acknowledgeProfileSuggestion()}>
    <p class="text-center">
      Great! if all goes well (nobody attempted to capture that planet at the same time), you ll be owning your first
      planet in
      <span class="text-cyan-700">conquest.eth</span>
      very soon!
    </p>
    <p class="text-center">
      You did not setup any profile info yet. We suggest you add info to your profile so other player can communicate
      with you and make plan together to conquer the universe!
    </p>
    <p class="text-center mt-3">
      <NavButton label="profile" href={`${base}/settings`}>Setup Profile</NavButton>
    </p>
    <p class="text-center mt-3">
      <NavButton label="profile" on:click={() => claimFlow.acknowledgeProfileSuggestion()}>Skip</NavButton>
    </p>
  </Modal>
{/if}
