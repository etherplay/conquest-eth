<script lang="ts">
  import {base} from '$app/paths';

  import Blockie from '$lib/components/account/Blockie.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';

  import Loading from '$lib/components/web/Loading.svelte';
  import {playersQuery} from '$lib/space/playersQuery';
  import {url} from '$lib/utils/url';

  // TODO SHare this in _layout ?
  import messageFlow from '$lib/flows/message';
  import MessageFlow from '$lib/flows/MessageFlow.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {Wallet} from '@ethersproject/wallet';
  import {flow, wallet} from '$lib/blockchain/wallet';
  import {hexZeroPad} from '@ethersproject/bytes';
  import Help from '$lib/components/utils/Help.svelte';
  import {BASIC_ALLIANCES_URL} from '$lib/config';

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
</script>

<NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>

<div class="m-4">
  <h2 class="text-xl mb-1">What are alliances?</h2>
  <p>Alliance allow 2 or more players to collaborate more easily in game. They</p>
  <ul>
    <li>- can combine attacks</li>
    <li>- can send each other spaceships without any loss</li>
    <li>- do not carry risk of attacking each other</li>
  </ul>
  <p>
    And they are programmable. Each alliance is a smart contract. You can create alliance with any rule you want. They
    can for example require a slashable deposit, taken away in case of betrayal.
  </p>

  {#if BASIC_ALLIANCES_URL}
    <div class="mt-4">
      <p>
        For now we have created a basic alliance that is managed by one admin user. Check it out <a
          class="underline"
          href={BASIC_ALLIANCES_URL}>here</a
        >
      </p>
    </div>
  {/if}
</div>

<h2 class="m-4 text-green-600 text-xl">Current Alliances:</h2>
{#if !$playersQuery || !$playersQuery.data || $playersQuery.step === 'LOADING'}
  <p>Loading...</p>
{:else}
  <div>
    <ul class="m-2">
      <hr />
      {#each Object.entries($playersQuery.data.alliances) as entry}
        <li>
          <h3 class="text-xl text-yellow-500">
            <Blockie class="inline w-10 h-10 m-1" address={entry[0]} /> Alliance {entry[0]}
          </h3>
          <a target="_blank" class="inline-block border-2 border-yellow-400 p-1 m-1" href={entry[1].frontendURI}
            >JOIN/MANAGE</a
          >
          <p>members:</p>
          <ul class="m-2">
            {#each entry[1].members as member}
              <li>
                <Blockie class="w-6 h-6 m-1 inline" address={member.address} />{member.address} (<button
                  class="underline"
                  on:click={() => messageFlow.show(member.address)}>contact</button
                >)
              </li>
            {/each}
          </ul>
          <hr />
        </li>
      {/each}
    </ul>
  </div>
{/if}

<!-- TODO share that in _layout ? -->
{#if $messageFlow.error || $messageFlow.step !== 'IDLE'}
  <MessageFlow />
{/if}
