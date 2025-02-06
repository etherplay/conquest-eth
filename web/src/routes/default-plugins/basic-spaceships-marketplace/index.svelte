<script lang="ts">
  import {chainTempo} from '$lib/blockchain/chainTempo';
  import {wallet} from '$lib/blockchain/wallet';
  import {nativeTokenSymbol} from '$lib/config';

  import {context} from '$lib/default-plugins/plugin';
  import {salesQuery} from '$lib/default-plugins/salesQuery';
  import {BigNumber} from '@ethersproject/bignumber';
  import {defaultAbiCoder} from '@ethersproject/abi';
  import {parseEther, formatEther} from '@ethersproject/units';
  import {Contract} from '@ethersproject/contracts';
  // import {onMount} from 'svelte';
  import {contractsInfos} from '$lib/blockchain/contracts';

  $: maxSell = $context.planet ? 2 * $context.planet.info.stats.cap + 1 : 0;

  chainTempo.startOrUpdateProvider(wallet.provider);

  $: sale =
    $salesQuery.step === 'READY'
      ? $salesQuery.data?.sales.find((v) => v.id == $context.planet?.info.location.id)
      : undefined;

  $: numForSale =
    sale && $context.planet?.state?.numSpaceships
      ? Math.min(Math.max(0, $context.planet.state.numSpaceships - sale.spaceshipsToKeep), sale.spaceshipsLeftToSell)
      : 0;

  let numSpaceshipsToKeep = 0;
  let numSpaceshipsToSell = 0;
  let pricePer10000 = 0.05; // TODO value from config
  let numToBuy = 0;

  let lastPlanet: string | undefined;
  context.subscribe((ctx) => {
    if (ctx.planet?.info.location.id !== lastPlanet) {
      lastPlanet = ctx.planet?.info.location.id;
      if (lastPlanet) {
        numSpaceshipsToKeep = Math.floor(ctx.planet.info.stats.cap / 2);
      }
    }
  });

  // onMount(() => {
  //   numSpaceships = Math.floor(($context.planet?.state?.numSpaceships || 0) / 2);
  // });

  async function submit(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    // const txData = wallet.contracts.BasicSpaceshipMarket.populateTransaction.setSpaceshipsForSale(
    //   $state.planet.info.location.id,
    //   BigNumber.from(pricePerUnit).mul('1000000000000000000'),
    //   numSpaceshipsToKeep,
    //   numSpaceshipsToSell
    // );

    const OuterSpace = new Contract(
      $contractsInfos.contracts.OuterSpace.address,
      $contractsInfos.contracts.OuterSpace.abi
    );
    const BasicSpaceshipMarket = new Contract(
      $contractsInfos.contracts.BasicSpaceshipMarket.address,
      $contractsInfos.contracts.BasicSpaceshipMarket.abi
    );

    const saleCallData = defaultAbiCoder.encode(
      ['uint256', 'uint144', 'uint32', 'uint40'],
      [
        $context.planet.info.location.id,
        parseEther((pricePer10000 / 10000).toFixed(18)),
        numSpaceshipsToKeep,
        numSpaceshipsToSell == 0 ? 0xffffffffff : numSpaceshipsToSell,
      ]
    );

    const txData = await OuterSpace.populateTransaction.setApprovalForAllIfNeededAndCall(
      BasicSpaceshipMarket.address,
      saleCallData
    );

    context.send_tx(txData as {to: string; data: string});
  }

  async function cancel(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const BasicSpaceshipMarket = new Contract(
      $contractsInfos.contracts.BasicSpaceshipMarket.address,
      $contractsInfos.contracts.BasicSpaceshipMarket.abi
    );

    const txData = await BasicSpaceshipMarket.populateTransaction.cancelSale($context.planet.info.location.id);
    context.send_tx(txData as {to: string; data: string});
  }

  async function purchase(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const location = $context.planet.info.location.id;
    const fleetSender = $context.planet.state.owner;
    const data = {
      abi: $contractsInfos.contracts.BasicSpaceshipMarket.abi.filter((v) => v.name === 'purchase')[0],
      numSpaceships: numToBuy,
      location,
      pricePerUnit: sale.pricePerUnit.toString(),
      contractAddress: $contractsInfos.contracts.BasicSpaceshipMarket.address,
      numSpaceshipsToKeep: sale.spaceshipsToKeep,
      numSpaceshipsAvailable: sale.spaceshipsLeftToSell,
      args: [location, '{numSpaceships}', fleetSender, '{toHash}', '{payee}', '{amountForPayee}'],
      fleetSender,
      msgValue: '{numSpaceships*pricePerUnit+amountForPayee}',
    };
    context.startSendFlow(data);
  }
</script>

<!-- <h1>Basic Spaceship Marketplace</h1> -->
<!-- force style here -->
<div style="background-color: white; color: black; width:100%;height:100%;">
  {#if $context.initialized}
    {#if $salesQuery.step !== 'READY'}
      <p>Loading...</p>
    {:else if $context.planet}
      {#if $context.planet.state.owner?.toLowerCase() === $context.account?.toLowerCase()}
        <p>There is {$context.planet.state.numSpaceships} spaceships on planet "{$context.planet.info.stats.name}"</p>
        <hr class="m-2" />

        {#if sale}
          <p>Current Sale:</p>
          <p>
            price per unit : {formatEther(sale.pricePerUnit)}
            {nativeTokenSymbol}
          </p>
          <p>
            available for sale : {numForSale}
          </p>
          <p>
            (left : {sale.spaceshipsLeftToSell})
          </p>

          <hr class="m-2" />
          <hr class="m-2" />

          <form>
            <div>
              <button
                on:click={cancel}
                type="submit"
                class="m-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >Cancel</button
              >
            </div>
          </form>

          <p>Or do you want to update the sale?</p>
        {:else}
          <p><strong>Put spaceships for sale</strong></p>
        {/if}

        <hr class="m-2" />
        <form>
          <div>
            <label for="numSpaceshipsToKeep">
              <p><strong>Num of spaceship to keep</strong> on planet at all time:</p>
              <p>(only sell spaceship when there is more)</p>
            </label>
            <div>
              <input
                class="text-cyan-300 bg-cyan-300"
                type="range"
                id="numSpaceshipsToKeep"
                name="numSpaceshipsToKeep"
                bind:value={numSpaceshipsToKeep}
                min="0"
                max={Math.max($context.planet.state.numSpaceships, $context.planet.info.stats.cap)}
              />
              <p>
                =&gt; <strong>{numSpaceshipsToKeep}</strong
                >{#if numSpaceshipsToKeep >= $context.planet.info.stats.cap}<span class="text-red-500"
                    >(can only sale if over capacity)</span
                  >{/if}{#if numSpaceshipsToKeep <= 0}<span class="text-red-500"
                    >(a buyer can thus buy all spaceship and put the planet at risk)</span
                  >{/if}
              </p>
            </div>
          </div>

          <hr class="m-2" />

          <div>
            <label for="numSpaceshipsToSell"
              ><p><strong>Num of spaceship to sell</strong> (stop selling afterward)</p>
              {#if numSpaceshipsToSell > 0}<p>
                  (assuming all sell, you ll get {(pricePer10000 * numSpaceshipsToSell) / 10000}
                  {nativeTokenSymbol})
                </p>{/if}
            </label>
            <div>
              <input
                class="text-cyan-300 bg-cyan-300"
                type="range"
                id="numSpaceshipsToSell"
                name="numSpaceshipsToSell"
                bind:value={numSpaceshipsToSell}
                min="0"
                max={maxSell}
              />
              <p>
                =&gt; <strong
                  >{#if numSpaceshipsToSell === 0} Infinite {:else} {numSpaceshipsToSell}{/if}</strong
                >
              </p>
            </div>
          </div>

          <hr class="m-2" />

          <div>
            <label for="pricePer10000">Price per <strong>10,000</strong> spaceship ({nativeTokenSymbol}) </label>
            <div>
              <input
                type="number"
                id="pricePer10000"
                name="pricePer10000"
                min="0"
                step="0.01"
                bind:value={pricePer10000}
              />
              <!-- <input type="number" id="pricePer10000" name="pricePer10000" min="0.01" step="0.01" bind:value={pricePer10000} /> -->
            </div>
          </div>
          <div>
            <button
              on:click={submit}
              type="submit"
              class="m-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >Put For Sale</button
            >
          </div>
        </form>
      {:else if sale}
        {#if numForSale == 0}
          <p>
            No spaceships available right now, come back later when the number of spaceship exceed {sale.spaceshipsToKeep}
          </p>

          <p>
            price per unit : {formatEther(sale.pricePerUnit)}
            {nativeTokenSymbol}
          </p>
        {:else}
          <p><strong>Purchase spaceships</strong></p>
          <hr class="m-2" />
          <p>How many spaceships do you want to purchase ?</p>
          <p>
            price per unit : {formatEther(sale.pricePerUnit)}
            {nativeTokenSymbol}
          </p>
          <p>
            available for sale : {numForSale}
          </p>

          <hr class="m-2" />
          <hr class="m-2" />

          <form>
            <div>
              <label for="numToBuy">Number of spaceships to buy</label>
              <div>
                <input
                  class="text-cyan-300 bg-cyan-300"
                  type="range"
                  id="numToBuy"
                  name="numToBuy"
                  bind:value={numToBuy}
                  min="0"
                  max={numForSale}
                />
                <p>
                  {numToBuy}
                </p>
                <p>
                  This will cost {formatEther(sale.pricePerUnit.mul(numToBuy))}
                  {nativeTokenSymbol}
                </p>
                <p>(note that you can change your mind as you select the destination planet)</p>
                <p>(Use that bar to check the price)</p>
              </div>
            </div>
            <div>
              <button
                on:click={purchase}
                type="submit"
                class="m-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >Purchase</button
              >
            </div>
          </form>
        {/if}
      {:else}
        <p>No Sale</p>
      {/if}
    {:else}
      <p>Waiting for showing instruction...</p>
    {/if}
  {:else}
    <p>Waiting for initialization to complete....</p>
  {/if}
</div>
