<script lang="ts">
  import NavButton from '$lib/components/navigation/NavButton.svelte';
  import {base} from '$app/paths';
  import WalletAccess from '$lib/blockchain/WalletAccess.svelte';
  import Button from '$lib/components/generic/PanelButton.svelte';
  import {privateWallet} from '$lib/account/privateWallet';
  import {conversations, setMissivProfile} from '$lib/missiv';

  function setProfile() {
    if ($conversations.registered.state !== 'ready') {
      throw new Error(`not ready to setProfile: ${$conversations.registered.state}`);
    }
    setMissivProfile({domainDescription: description}, !!$conversations.registered.user);
  }

  $: descriptionFromProfile =
    $conversations.registered.state === 'ready' && $conversations.registered.user?.domainDescription;

  let ownerSet: string | undefined = undefined;
  let description = '';
  $: changed = description !== '' && descriptionFromProfile !== description;

  $: {
    if ($conversations.registered.state === 'ready' && (!ownerSet || ownerSet !== $conversations.registered.user)) {
      ownerSet = $conversations.registered.user;
      description = descriptionFromProfile || '';
    }
  }
</script>

<!-- TODO https://tailwindui.com/components/application-ui/page-examples/settings-screens-->

<div class="w-full h-full bg-black">
  <NavButton label="Back To Game" href={`${base}/`}>Back To Game</NavButton>

  <WalletAccess>
    {#if $privateWallet.step !== 'READY'}
      <Button
        class="w-max-content m-4"
        label="connect"
        disabled={$privateWallet.step !== 'IDLE'}
        on:click={() => privateWallet.login()}
      >
        Connect
      </Button>
    {:else}
      <form class="space-y-8 divide-y divide-gray-200 text-white">
        <div class="space-y-8 divide-y divide-gray-200 sm:space-y-5">
          <div>
            <div>
              <h3 class="text-lg leading-6 font-medium">Profile</h3>
            </div>

            <div class="mt-6 sm:mt-5 space-y-6 sm:space-y-5 text-gray-200">
              <!-- <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label for="name" class="block text-sm font-medium sm:mt-px sm:pt-2"> Name </label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <div class="max-w-lg flex rounded-md shadow-sm">
                    <input
                      bind:value={name}
                      type="text"
                      name="name"
                      id="name"
                      autocomplete="off"
                      class="flex-1 block w-full focus:ring-indigo-500 focus:border-indigo-500 min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300 bg-gray-700"
                    />
                  </div>
                </div>
              </div> -->

              <div class="sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:border-t sm:border-gray-200 sm:pt-5">
                <label for="Contact" class="block text-sm font-medium sm:mt-px sm:pt-2"> Contact </label>
                <div class="mt-1 sm:mt-0 sm:col-span-2">
                  <textarea
                    bind:value={description}
                    id="contact"
                    name="contact"
                    rows="3"
                    class="max-w-lg shadow-sm block w-full focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border-gray-300 rounded-md  bg-gray-700"
                  />
                  <p class="mt-2 text-sm">Describe how other players can contact you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
      <div class="pt-5">
        <div class="flex justify-end">
          <button
            disabled={!changed}
            on:click={setProfile}
            class={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md  ${
              changed
                ? 'text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                : 'text-gray-300 bg-gray-600 hover:bg-gray-700'
            } `}
          >
            Save
          </button>
        </div>
      </div>
    {/if}
  </WalletAccess>
</div>
