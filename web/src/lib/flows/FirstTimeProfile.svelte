<script lang="ts">
  import Modal from '$lib/components/generic/Modal.svelte';
  import PanelButton from '$lib/components/generic/PanelButton.svelte';
  import {setMissivProfile} from '$lib/missiv';

  let description = '';

  async function setProfile() {
    setMissivProfile({domainDescription: description}, false);
  }
</script>

<Modal>
  <p class="mb-3">Before you proceed:</p>
  <p class="mb-3">
    Setup a profile so that other player can reach out to you. You can put anything like a discord username or telegram
    handle.
  </p>
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
  <div class="text-center">
    <PanelButton label="OK" class="mt-4" on:click={setProfile}>SETUP</PanelButton>
  </div>
</Modal>
