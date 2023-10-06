<script>
  import logs from '$lib/stores/logs';
  let showLog = false;
  function show() {
    showLog = true;
  }
  function close() {
    showLog = false;
  }
  function toggle() {
    showLog = !showLog;
  }
</script>

<div class="fixed bottom-0 right-0 flex flex-col items-end ml-6 w-full z-50">
  {#if showLog}
    <div class="mr-5 py-2 flex flex-col sm:w-1/2 md:w-1/3 lg:w-1/4 max-h-screen">
      <!-- close button -->
      <div
        class="bg-red-500 hover:bg-red-600 text-white mb-1 w-10 flex justify-center items-center px-2 py-1 rounded self-end cursor-pointer"
        on:click={() => close()}
      >
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 16 16"
          class="bi bi-x"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"
          />
          <path
            fill-rule="evenodd"
            d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"
          />
        </svg>
      </div>
      <!-- chats -->
      <div class="flex flex-col bg-gray-200 px-2 overflow-auto max-w-xs">
        {#each $logs as log}
          <div class="bg-white text-gray-700 p-2 self-start my-2 rounded-md shadow mr-3">{log}</div>
        {/each}
      </div>
      <!-- send message -->
      <!-- <div class="relative bg-white">
        <input
          type="text"
          name="message"
          placeholder="ketik pesan anda"
          class="pl-4 pr-16 py-2 border border-green-500 focus:outline-none w-full" />
        <button
          class="absolute right-0 bottom-0 text-green-600 bg-white  hover:text-green-500 m-1 px-3 py-1 w-auto transistion-color duration-100 focus:outline-none">Send</button>
      </div> -->
    </div>
  {:else}
    <div
      class="mx-10 mb-6 mt-4 text-green-500 hover:text-green-600 flex justify-center items-center cursor-pointer"
      on:click={() => toggle()}
    >
      <svg class="w-16 h-16" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    </div>
  {/if}
</div>
