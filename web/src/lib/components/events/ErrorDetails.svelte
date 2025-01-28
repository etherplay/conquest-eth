<script lang="ts">
  import {time} from '$lib/time';

  import {timeToText} from '$lib/utils';

  import Modal from '$lib/components/generic/Modal.svelte';
  import type {SpaceError} from '$lib/space/errors';
  import {account, PendingSend} from '$lib/account/account';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {now} from '$lib/time';
  import Blockie from '../account/Blockie.svelte';
  import Coord from '../utils/Coord.svelte';
  import {xyToLocation} from 'conquest-eth-common';

  export let error: SpaceError;
  export let okLabel: string = 'OK';
  export let closeButton: boolean;

  let genericTitle;
  $: if (error?.status === 'FAILURE') {
    genericTitle = 'Transaction Failed';
  } else if (error?.status === 'CANCELED') {
    genericTitle = 'Transaction Cancelled';
  } else if (error?.status === 'TIMEOUT') {
    if (error?.action.type === 'SEND' && error?.action.actualLaunchTime) {
      genericTitle = 'Resolution Timeout';
    } else {
      genericTitle = 'Transaction Timeout';
    }
  } else {
    genericTitle = 'Loading...';
  }

  let actionTitle;
  $: {
    if (error.action.type === 'SEND') {
      actionTitle = 'Could not send your fleet';
    } else if (error.action.type === 'EXIT') {
      actionTitle = 'Could not exit planet';
    } else if (error.action.type === 'CAPTURE') {
      actionTitle = 'Could not capture planet';
    } else if (error.action.type === 'RESOLUTION') {
      actionTitle = 'Could not resolve your fleet';
    } else if (error.action.type === 'WITHDRAWAL') {
      actionTitle = 'Could not withdraw';
    }
  }

  let sendAction: PendingSend | undefined;
  $: {
    if (error.action.type === 'RESOLUTION') {
      sendAction = account.getSendActionFromFleetId(error.action.fleetId);
    }
  }

  async function acknowledge() {
    await account.acknowledgeError(error.txHash, null, error.late ? now() : undefined);
  }
</script>

{#if error}
  <Modal
    maxWidth="max-w-screen-xl"
    globalCloseButton={closeButton}
    cancelable={closeButton}
    on:close
    border_color="border-red-400"
  >
    <div class="bg-black shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:px-6">
        <h3 class="text-lg leading-6 font-medium text-red-400">
          {actionTitle}
        </h3>

        <p class="mt-1 max-w-2xl text-sm text-gray-500">
          {timeToText($time - error.action.timestamp, {compact: true})} ago
        </p>
      </div>
      <div class="border-t border-gray-800 px-4 py-5 sm:p-0">
        <dl class="sm:divide-y sm:divide-gray-800">
          {#if error.action.type === 'SEND'}
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Owner</dt>
              <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                <Blockie address={error.action.fleetOwner} />
              </dd>
            </div>

            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Destination</dt>
              <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                <Coord location={xyToLocation(error.action.from.x, error.action.from.y)} />
              </dd>
            </div>

            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Quantity</dt>
              <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                {error.action.quantity}
              </dd>
            </div>
          {:else if error.action.type === 'CAPTURE'}
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Planet</dt>
              <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                <!-- TODO  handle multiple coords -->
                <Coord location={xyToLocation(error.action.planetCoords[0].x, error.action.planetCoords[0].y)} />
              </dd>
            </div>
          {:else if error.action.type === 'WITHDRAWAL'}
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Planet List</dt>
              <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                {#each error.action.planets as planet}
                  <Coord location={xyToLocation(planet.x, planet.y)} />,
                {:else}
                  Simple Withdrawal
                {/each}
              </dd>
            </div>
          {:else if error.action.type === 'RESOLUTION'}
            {#if sendAction}
              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Owner</dt>
                <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                  <Blockie address={sendAction.fleetOwner} />
                </dd>
              </div>

              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Destination</dt>
                <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                  <Coord location={xyToLocation(sendAction.from.x, sendAction.from.y)} />
                </dd>
              </div>

              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">Quantity</dt>
                <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                  {sendAction.quantity}
                </dd>
              </div>
            {:else}
              <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt class="text-sm font-medium text-gray-500">FleetID</dt>
                <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                  <p>{error.action.fleetId}</p>
                  <p>Could not get more info...</p>
                </dd>
              </div>
            {/if}
          {:else if error.action.type === 'EXIT'}
            <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt class="text-sm font-medium text-gray-500">Planet</dt>
              <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
                <Coord location={xyToLocation(error.action.planetCoords.x, error.action.planetCoords.y)} />
              </dd>
            </div>
          {/if}
          <div class="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt class="text-sm font-medium text-red-500">{genericTitle}</dt>
            <dd class="mt-1 text-sm text-gray-100 sm:mt-0 sm:col-span-2">
              {#if !error.txHash || error.txHash === 'undefined'}
                <p class="text-orange-700">Hmm, no transaction found for this error</p>
              {:else}
                <a
                  href={`${import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION}${error.txHash}`}
                  target="_blank"
                  class="text-indigo-600 hover:text-indigo-100">{error.txHash}</a
                >
              {/if}
            </dd>
          </div>
        </dl>
      </div>
    </div>

    <div class="text-center">
      <Button class="mt-4 text-center" label="Retry" on:click={acknowledge}>{okLabel}</Button>
    </div>
  </Modal>
{/if}
