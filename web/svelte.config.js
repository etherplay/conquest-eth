import preprocess from 'svelte-preprocess';
import adapter_ipfs from 'sveltejs-adapter-ipfs';
import {execSync} from 'child_process';
import fs from 'fs';

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath).toString());
  } catch (e) {
    return {};
  }
}
const pkg = loadJSON('./package.json');

let VERSION = `timestamp_${Date.now()}`;
try {
  VERSION = execSync('git rev-parse --short HEAD', {stdio: ['ignore', 'pipe', 'ignore']})
    .toString()
    .trim();
} catch (e) {
  console.error(e);
}
console.log(`VERSION: ${VERSION}`);

if (!process.env.VITE_CHAIN_ID) {
  try {
    const contractsInfo = JSON.parse(fs.readFileSync('./src/lib/contracts.json'));
    process.env.VITE_CHAIN_ID = contractsInfo.chainId;
  } catch (e) {
    console.error(e);
  }
}

let outputFolder = './build';

// if (process.env.VERCEL) {
//   // allow no config when creating a vercel project
//   outputFolder = '../public';
//   console.log('building on VERCEL...');
// }

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess({
    sourceMap: true,
  }),

  kit: {
    adapter: adapter_ipfs({
      assets: outputFolder,
      pages: outputFolder,
      removeSourceMap: true,
      copyBeforeSourceMapRemoval: 'release',
      removeBuiltInServiceWorkerRegistration: true,
      injectPagesInServiceWorker: true,
      injectDebugConsole: true,
    }),
    target: '#svelte',
    trailingSlash: 'ignore',
    vite: {
      mode: process.env.MODE,
      build: {
        sourcemap: true,
      },
      define: {
        __VERSION__: JSON.stringify(VERSION),
      },
    },
  },
};

export default config;
