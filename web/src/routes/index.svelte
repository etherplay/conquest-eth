<script lang="ts">
  import Storereader from '$lib/components/storereader.svelte';

  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import MapScreen from '$lib/screens/map/MapScreen.svelte';
  import {fade} from 'svelte/transition';
  import ClaimTokenScreen from '$lib/screens/tokenClaim/ClaimTokenScreen.svelte';

  import {logo} from '$lib/screens/loading/logo';

  import {onMount} from 'svelte';
  import {browser} from '$app/env';
  import {camera} from '$lib/map/camera';
  import {page} from '$app/stores';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import selection from '$lib/map/selection';
  import {url} from '$lib/utils/url';
  import IFramePluginList from '$lib/plugins/IFramePluginList.svelte';

  onMount(() => {
    let x = parseInt($page.url.searchParams.get('x'));
    let y = parseInt($page.url.searchParams.get('y'));

    // console.log({
    //   search: window.location.search,
    //   hash: window.location.hash,
    //   both: window.location.search + window.location.hash,
    // });
    window.history.replaceState(
      '',
      document.title,
      url(window.location.search, window.location.hash ? window.location.hash.slice(1) : undefined)
    );
    if (!isNaN(x) && !isNaN(y)) {
      // const locX = Math.floor((Math.round(x) + 2) / 4);
      // const locY = Math.floor((Math.round(y) + 2) / 4);
      // const planetInfo = spaceInfo.getPlanetInfo(locX, locY);
      // // let planetInfo;
      // // for (let i = 0; i < 9; i++) {
      // //   const offsetX = i % 3;
      // //   const offsetY = Math.floor(i / 3);
      // //   planetInfo = spaceInfo.getPlanetInfo(
      // //     locX + (offsetX == 2 ? -1 : offsetX),
      // //     locY + (offsetY == 2 ? -1 : offsetY)
      // //   );
      // // }
      // if (planetInfo) {
      //   selection.select(planetInfo.location.x, planetInfo.location.y);
      // }
      // camera.navigate(x, y, 20);

      const planetInfo = spaceInfo.getPlanetInfo(x, y);
      if (planetInfo) {
        selection.select(x, y);
        camera.navigate(planetInfo.location.globalX, planetInfo.location.globalY, 20);
      }
    }
  });
</script>

<Storereader />

<WalletAccess>
  <ClaimTokenScreen />
  <MapScreen />
</WalletAccess>

{#if $logo && $logo.stage === 1}
  <div class="fixed z-50 inset-0 overflow-y-auto bg-black" out:fade on:click={() => logo.nextStage()}>
    <div class="justify-center mt-32 text-center">
      <img
        class="mb-8 mx-auto max-w-md"
        src="./conquest.png"
        alt="conquest.eth"
        style="width:80%;"
        on:load={() => logo.gameLogoReady()}
      />
      <p class="m-6 mt-20 text-gray-500 text-2xl font-black">
        An unstoppable and open-ended game of strategy and diplomacy running on ethereum.
      </p>
    </div>
  </div>
{/if}

{#if $logo && $logo.stage === 0}
  <div class="fixed z-50 inset-0 overflow-y-auto bg-black h-full" out:fade on:click={() => logo.nextStage()}>
    <div class="justify-center text-center h-full flex items-center">
      {#if browser}
        <img
          class="mb-8 mx-auto max-w-xs"
          src="./logo_with_text_on_black.png"
          alt="etherplay.eth"
          style="width:80%; heigh: 40%;"
          on:load={() => logo.etherplayLogoReady()}
        />
        <!-- <p class="m-6 text-gray-400 dark:text-gray-500 text-4xl font-black">
      presents
    </p> -->
      {/if}
    </div>
  </div>
{/if}

<IFramePluginList />
