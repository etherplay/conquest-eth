<script lang="ts">
  import {timeToText} from '$lib/utils';

  export let countdown: {timeLeft: number};
</script>

<div class="fixed z-50 inset-0 overflow-y-auto bg-black">
  <div class="justify-center mt-32 text-center">
    <img class="mb-8 mx-auto max-w-md" src="./conquest.png" alt="conquest.eth" style="width:80%;" />
    <p class="m-6 mt-20 text-gray-500 text-2xl font-black">
      An unstoppable and open-ended game of strategy and diplomacy running on ethereum.
    </p>

    <p class="text-2xl">The game will start in {timeToText(countdown.timeLeft)}</p>
  </div>
</div>
