<script lang="ts">
  import {base} from '$app/paths';
  import {wallet} from '$lib/blockchain/wallet';

  import Blockie from '$lib/components/account/Blockie.svelte';
  import NavButton from '$lib/components/navigation/NavButton.svelte';

  import {highscores, highscoresData} from '$lib/space/highscores';
  import {onMount} from 'svelte';
  onMount(() => {
    highscoresData.start();
  });
</script>

<div class="w-full h-full bg-black text-white">
  <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>
  <div class="markdown text-white p-3">
    <h1 class="text-cyan-400"><span class="font-black">Highscores</span></h1>

    <!-- //TODO update date -->
    <!-- <p class="text-gray-400">Score will be frozen past April 8th 10PM UTC</p>
    <p class="text-yellow-400">Time Left: {timeToText(1649455200 - $time)}</p> -->
    {#if $highscores.error}
      <span class="text-red-600">{$highscores.error}</span>
    {:else if $highscores.step === 'IDLE'}
      <span class="text-yellow-600">Please wait...</span>
    {:else if $highscores.step === 'LOADING'}
      <span class="text-yellow-600">Loading...</span>
    {:else}
      <ul class="my-4">
        {#each $highscores.data as player, index}
          <li class={`${$wallet.address?.toLowerCase() === player.id ? 'font-black text-green-400' : ''}`}>
            <span class="w-10 inline-block">{index + 1}:</span>
            <Blockie class="w-6 h-6 inline my-1/2 mr-2" address={player.id} />
            <div class="w-6 h-6 text-xs mr-4 inline-block" style={`white-space: nowrap;overflow: hidden;`}>
              {player.id}
            </div>
            <!-- <table><tr><tl>{player.score}</tl><tl>{player.points}</tl></tr></table> -->
            <!-- <span style="font-family: monospace;">{player.pool_score}</span> -->

            <span style="font-family: monospace;">{Math.floor(player.fixed_score * 100000)}</span>

            <span style="font-family: monospace;">{player.points}</span>
            <!-- 
            <div>{format(player.account)}</div>
            <div>{format(player.globalData)}</div> -->

            <!-- <PlayCoin class="w-4 h-4 inline" />
            in control, including
            {player.tokenBalance}
            <PlayCoin class="w-4 h-4 inline" />
            left to spend and
            {player.tokenToWithdraw}
            <PlayCoin class="w-4 h-4 inline" />
            to withdraw (was given
            {player.tokenGiven}
            <PlayCoin class="w-4 h-4 inline" />) -->
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
