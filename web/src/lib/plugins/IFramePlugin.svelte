<script lang="ts">
  import {wallet} from '$lib/blockchain/wallet';
  import {planetMetadata} from '$lib/space/planetMetadata';
  import sendFlow from '$lib/flows/send';

  import {onDestroy, onMount} from 'svelte';
  import {pluginShowing, registerIframe, unregisterIframe} from './currentPlugin';
  import {spaceInfo} from '$lib/space/spaceInfo';
  import {account} from '$lib/account/account';

  export let src: string;
  export let title: string;
  export let pluginConfig: any;

  let iframe: HTMLIFrameElement;
  let acknowledged = false;

  async function onIFrameMessage(event: MessageEvent) {
    if (event.source === iframe.contentWindow) {
      const data = event.data;
      let decoded;
      try {
        decoded = JSON.parse(data);
      } catch (error) {
        console.error(event);
      }
      if (decoded) {
        // console.log(`parent receiving ${decoded.type}`);
        if (decoded.type === 'init_acknowledged') {
          if (!acknowledged) {
            registerIframe(src, iframe.contentWindow, pluginConfig);
            acknowledged = true;
          }
        } else if (decoded.type === 'send_tx') {
          // console.log(`TX REUEST FROM PLUGIN`, decoded);
          let tx;
          try {
            tx = await wallet.provider.getSigner().sendTransaction({to: decoded.to, data: decoded.data});
            iframe.contentWindow.postMessage(JSON.stringify({type: 'reply', id: decoded.id, result: tx.hash}), src);
          } catch (e) {
            console.error(e);
            iframe.contentWindow.postMessage(JSON.stringify({type: 'reply', id: decoded.id, error: e}), src);
          }
        } else if (decoded.type === 'planets_reset') {
          const reset = decoded.reset;
          planetMetadata.update((v) => {
            for (const key of Object.keys(v)) {
              for (const field of reset.fields) {
                delete v[key][field];
              }
            }
            for (const planet of reset.planets) {
              v[planet.id] = v[planet.id] || {};
              for (const field of reset.fields) {
                v[planet.id][field] = planet[field];
              }
            }
            return v;
          });
        } else if (decoded.type === 'send_flow') {
          const {
            abi,
            numSpaceships,
            location,
            pricePerUnit,
            contractAddress,
            numSpaceshipsToKeep,
            numSpaceshipsAvailable,
            args,
            fleetSender,
            msgValue,
          } = decoded;
          const planetInfo = spaceInfo.getPlanetInfoViaId(decoded.location);
          close();
          console.log({location, owner: $account.ownerAddress});
          sendFlow.sendFrom(planetInfo.location, {
            fleetOwner: $account.ownerAddress,
            abi,
            contractAddress,
            numSpaceshipsToKeep,
            numSpaceshipsAvailable,
            numSpaceships,
            pricePerUnit,
            args,
            fleetSender,
            msgValue,
          });
        }
      }
    }
  }

  let tryCount = 0;
  function initUntilAcknowledged() {
    if (!acknowledged && tryCount < 10) {
      // console.log(`sending init`);
      tryCount++;
      iframe.contentWindow.postMessage(JSON.stringify({type: 'init'}), src);
      setTimeout(initUntilAcknowledged, 300);
    }
  }

  onMount(() => {
    acknowledged = false;
    initUntilAcknowledged();
    window.addEventListener('message', onIFrameMessage);
  });

  onDestroy(() => {
    console.log(`sending stop`);
    unregisterIframe(src);
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', onIFrameMessage);
      iframe.contentWindow.postMessage(JSON.stringify({type: 'stop'}), src);
    }
  });

  function close() {
    pluginShowing.hide();
  }
</script>

<div
  class={`z-50 fixed w-full h-full top-0 left-0 flex items-center justify-center ${
    $pluginShowing === src ? '' : 'hidden'
  }`}
>
  <!-- clickable dark overlay -->
  <div on:click={close} class="absolute w-full h-full bg-gray-900 opacity-80" />

  <!--modal-->
  <div class={`absolute border-2 w-11/12 mx-auto overflow-y-auto bg-gray-900 max-h-screen text-cyan-300 h-5/6`}>
    <div
      on:click={close}
      class="modal-close absolute top-0 right-0 cursor-pointer flex flex-col items-center mt-4 mr-4 text-sm"
    >
      <svg
        class="fill-current text-white"
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 18 18"
      >
        <path
          d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"
        />
      </svg>
      <span class="text-sm">(Esc)</span>
    </div>

    <!-- Add margin if you want to see some of the overlay behind the modal-->
    <div class="modal-content py-4 text-left px-6 h-5/6">
      <div class="flex justify-between items-center">
        <p class="text-2xl font-bold">PLUGIN: {title}</p>

        <div on:click={close} class="modal-close cursor-pointer z-50">
          <svg
            class="fill-current text-black"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 18 18"
          >
            <path
              d="M14.53 4.53l-1.06-1.06L9 7.94 4.53 3.47 3.47 4.53 7.94 9l-4.47 4.47 1.06 1.06L9 10.06l4.47 4.47 1.06-1.06L10.06 9z"
            />
          </svg>
        </div>
      </div>
      <iframe
        {title}
        {src}
        bind:this={iframe}
        style="width:100%; margin-top:1em;border: 2px white solid; height:100%"
      />
    </div>
  </div>
</div>
