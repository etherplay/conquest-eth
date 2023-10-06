<script lang="ts">
  export let text: string;
  export let textCallBack: () => string | undefined = undefined;
  export let copiedDirection = 'right';

  let copied = false;
  async function copy() {
    let successful = false;
    let textToCopy = text;
    if (textCallBack) {
      textToCopy = textCallBack();
    }
    navigator.clipboard.writeText(textToCopy);
    successful = true;

    // if (text) {
    //   navigator.clipboard.writeText(text);
    //   successful = true;
    // } else {
    //   successful = document.execCommand('copy');
    //   console.log(successful);
    // }
    if (successful) {
      copied = true;
      setTimeout(() => (copied = false), 600);
    }
  }
</script>

<div class="inline-flex relative w-fit" on:click={copy}>
  <div
    class={`${copied ? 'opacity-100' : 'opacity-0'} absolute inline-block top-0 ${
      copiedDirection === 'right'
        ? 'right-0 left-auto translate-x-2/4 px-2.5'
        : 'left-0 right-auto -translate-x-2/4 px2.5'
    } bottom-auto-translate-y-1/2 rotate-0 skew-x-0 skew-y-0 scale-x-100 scale-y-100 py-1 text-xs leading-none text-center whitespace-nowrap align-baseline font-bold bg-indigo-700 text-white rounded-full z-10 transition-opacity duration-300`}
  >
    <p>Copied</p>
  </div>
  <slot />
</div>
