<script lang="ts">
  // blockie generation code from https://github.com/stephensprinkle/react-blockies, itself referenced from https://github.com/alexvandesande/blockies
  import {afterUpdate, tick} from 'svelte';
  import Copiable from '../generic/Copiable.svelte';
  import {initialContractsInfos} from '$lib/blockchain/contracts';

  export let copiedDirection = 'right';
  export let copiable = true;
  export let _class = '';
  export {_class as class};
  export let address: string;
  export let scale = 4;

  let lastOptions:
    | {
        address: string;
        scale: number;
      }
    | undefined = undefined;

  let canvas: HTMLCanvasElement;

  // The random number is a js implementation of the Xorshift PRNG
  const randseed = new Array(4); // Xorshift: [x, y, z, w] 32 bit values

  function seedrand(seed: string): void {
    for (let i = 0; i < randseed.length; i++) {
      randseed[i] = 0;
    }
    for (let i = 0; i < seed.length; i++) {
      randseed[i % 4] = (randseed[i % 4] << 5) - randseed[i % 4] + seed.charCodeAt(i);
    }
  }

  function rand(): number {
    // based on Java's String.hashCode(), expanded to 4 32bit values
    const t = randseed[0] ^ (randseed[0] << 11);

    randseed[0] = randseed[1];
    randseed[1] = randseed[2];
    randseed[2] = randseed[3];
    randseed[3] = randseed[3] ^ (randseed[3] >> 19) ^ t ^ (t >> 8);

    return (randseed[3] >>> 0) / ((1 << 31) >>> 0);
  }

  function createColor(): string {
    // saturation is the whole color spectrum
    const h = Math.floor(rand() * 360);
    // saturation goes from 40 to 100, it avoids greyish colors
    const s = rand() * 60 + 40 + '%';
    // lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
    const l = (rand() + rand() + rand() + rand()) * 25 + '%';

    const color = 'hsl(' + h + ',' + s + ',' + l + ')';
    return color;
  }

  function createImageData(size: number): number[] {
    const width = size; // Only support square icons for now
    const height = size;

    const dataWidth = Math.ceil(width / 2);
    const mirrorWidth = width - dataWidth;

    const data = [];
    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < dataWidth; x++) {
        // this makes foreground and background color to have a 43% (1/2.3) probability
        // spot color has 13% chance
        row[x] = Math.floor(rand() * 2.3);
      }
      const r = row.slice(0, mirrorWidth);
      r.reverse();
      row = row.concat(r);

      for (let i = 0; i < row.length; i++) {
        data.push(row[i]);
      }
    }

    return data;
  }

  function setCanvas(
    canvas: HTMLCanvasElement,
    imageData: number[],
    color: string,
    scale: number,
    bgcolor: string,
    spotcolor: string
  ) {
    const width = Math.sqrt(imageData.length);
    const size = width * scale;

    canvas.width = size;
    canvas.height = size;

    const cc = canvas.getContext('2d');
    if (cc) {
      cc.fillStyle = bgcolor;
      cc.fillRect(0, 0, canvas.width, canvas.height);
      cc.fillStyle = color;

      for (let i = 0; i < imageData.length; i++) {
        // if data is 2, choose spot color, if 1 choose foreground
        cc.fillStyle = imageData[i] === 1 ? color : spotcolor;

        // if data is 0, leave the background
        if (imageData[i]) {
          const row = Math.floor(i / width);
          const col = i % width;

          cc.fillRect(col * scale, row * scale, scale, scale);
        }
      }
    } else {
      console.error(`could not create 2d context for Blockie canvas`);
    }
  }

  function update() {
    if (lastOptions && lastOptions.address === address && lastOptions.scale === scale) {
      return;
    }
    lastOptions = {
      address,
      scale,
    };

    const pirateData = [
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0,
      0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 215, 123, 186, 255, 0, 0, 0, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 215, 123, 186, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255,
      0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255,
      255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0,
      255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0,
      0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0,
      255, 0, 0, 0, 255,
    ];

    const yakuzaData = [
      // Row 1
      255, 0, 77, 0, 0, 0, 0, 0, 0, 255, 255, 39, 255, 255, 39, 0, 0, 0, 0, 0, 0, 255, 0, 77,
      // Row 2
      255, 0, 77, 255, 0, 77, 255, 255, 39, 0, 0, 0, 0, 0, 0, 255, 255, 39, 255, 0, 77, 255, 0, 77,
      // Row 3
      0, 0, 0, 255, 0, 77, 255, 255, 39, 255, 255, 39, 255, 255, 39, 255, 255, 39, 255, 0, 77, 0, 0, 0,
      // Row 4
      0, 0, 0, 0, 0, 0, 255, 255, 39, 0, 0, 0, 0, 0, 0, 255, 255, 39, 0, 0, 0, 0, 0, 0,
      // Row 5
      0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 77, 255, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      // Row 6
      0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 77, 255, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      // Row 7
      0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 0, 77, 255, 0, 77, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      // Row 8
      0, 0, 0, 0, 0, 0, 255, 0, 77, 255, 0, 77, 255, 0, 77, 255, 0, 77, 0, 0, 0, 0, 0, 0,
    ];

    let specificData: number[] | undefined;

    if (
      address.toLowerCase() === '0xdeaddeaddeaddeaddeaddeaddeaddeaddeaddead' ||
      address.toLowerCase() === '0x35258bb585e18a92756d87d9990c050d7a99a207'
    ) {
      specificData = pirateData;
    } else if (
      (initialContractsInfos as any).contracts.Yakuza &&
      (initialContractsInfos as any).contracts.Yakuza.address.toLowerCase() === address.toLowerCase()
    ) {
      specificData = yakuzaData;
    }
    if (specificData) {
      const data = specificData;
      const width = 8;
      const size = width * scale;

      canvas.width = size;
      canvas.height = size;

      const cc = canvas.getContext('2d');
      if (cc) {
        for (let i = 0; i < data.length; i += 4) {
          const color = `rgba(${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]})`;
          cc.fillStyle = color;
          console.log(cc.fillStyle, color);
          const row = Math.floor(Math.floor(i / 4) / width);
          const col = Math.floor(i / 4) % width;
          cc.fillRect(col * scale, row * scale, scale, scale);
        }
      } else {
        console.error(`could not create 2d context for Blockie canvas`);
      }
    } else {
      seedrand((address && address.toLowerCase()) || '0x0000000000000000000000000000000000000000');
      const color = createColor();
      const bgcolor = createColor();
      const spotcolor = createColor();
      const imageData = createImageData(8);
      setCanvas(canvas, imageData, color, scale, bgcolor, spotcolor);
    }
  }

  afterUpdate(update);

  let copied = false;
  async function copy() {
    navigator.clipboard.writeText(address);
    copied = true;
    setTimeout(() => (copied = false), 600);
  }
</script>

{#if copiable}
  <Copiable text={address} {copiedDirection}>
    <canvas class={_class} bind:this={canvas} alt={address} />
  </Copiable>
{:else}
  <canvas class={_class} bind:this={canvas} alt={address} />
{/if}

<style>
  canvas {
    image-rendering: -moz-crisp-edges;
    image-rendering: -webkit-crisp-edges;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
