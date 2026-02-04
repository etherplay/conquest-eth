import {initWeb3W} from 'web3w';
// import {WalletConnectModuleLoader} from 'web3w-walletconnect-loader';
// import {PortisModuleLoader} from 'web3w-portis-loader';
import {contractsInfos, initialContractsInfos} from '$lib/blockchain/contracts';
import {notifications} from '../web/notifications';
import {
  webWalletURL,
  finality,
  chainName,
  fallbackProviderOrUrl,
  chainId,
  localDev,
  nativeTokenName,
  nativeTokenSymbol,
  nativeTokenDecimal,
} from '$lib/config';
import {isCorrected, correctTime} from '$lib/time';
import {base} from '$app/paths';
import {chainTempo} from '$lib/blockchain/chainTempo';
import * as Sentry from '@sentry/browser';
import {get} from 'svelte/store';

// convert to old format
function convertContractsInfo(contractsInfo: typeof initialContractsInfos) {
  return {
    chainId: contractsInfo.chain.id.toString(),
    name: contractsInfo.chain.name,
    contracts: contractsInfo.contracts,
  };
}

const walletStores = initWeb3W({
  chainConfigs: convertContractsInfo(get(contractsInfos)),
  builtin: {autoProbe: true},
  transactions: {
    autoDelete: true,
    finality,
  },
  flow: {
    autoUnlock: true,
  },
  autoSelectPrevious: true,
  localStoragePrefix: (base && base.startsWith('/ipfs/')) || base.startsWith('/ipns/') ? base.slice(6) : undefined, // ensure local storage is not conflicting across web3w-based apps on ipfs gateways
  options: [
    'builtin',
    // new WalletConnectModuleLoader({
    //   nodeUrl: typeof fallbackProviderOrUrl === 'string' ? fallbackProviderOrUrl : undefined, // TODO ?
    //   chainId,
    //   infuraId: 'bc0bdd4eaac640278cdebc3aa91fabe4',
    // }),
    // new PortisModuleLoader('7bc13179-0c86-4e5f-b8d4-ef91cd3e0882', {
    //   chainId,
    //   nodeUrl:
    //     typeof webWalletURL === 'string' && webWalletURL !== ''
    //       ? webWalletURL
    //       : typeof fallbackProviderOrUrl === 'string' && fallbackProviderOrUrl !== ''
    //       ? fallbackProviderOrUrl
    //       : undefined, // TODO ?
    // }),
  ],
  fallbackNode: fallbackProviderOrUrl,
  checkGenesis: localDev,
});

export const {wallet, transactions, builtin, chain, balance, flow, fallback} = walletStores;

function notifyFailure(tx: {hash: string}) {
  notifications.queue({
    id: tx.hash,
    delay: 0,
    title: 'Transaction Error',
    text: 'The Transaction failed',
    type: 'error',
    onAcknowledge: () => transactions.acknowledge(tx.hash, 'failure'),
  });
}

function notifyCancelled(tx: {hash: string}) {
  notifications.queue({
    id: tx.hash,
    delay: 3,
    title: 'Transaction Cancelled',
    text: 'The Transaction Has Been Replaced',
    type: 'info',
    onAcknowledge: () => transactions.acknowledge(tx.hash, 'cancelled'),
  });
}

transactions.subscribe(($transactions) => {
  for (const tx of $transactions.concat()) {
    if (tx.confirmations > 0 && !tx.acknowledged) {
      if (tx.status === 'failure') {
        notifyFailure(tx);
      } else if (tx.status === 'cancelled') {
        notifyCancelled(tx);
      } else {
        // auto acknowledge
        transactions.acknowledge(tx.hash, tx.status);
      }
    }
  }
});

chain.subscribe(async (v) => {
  chainTempo.startOrUpdateProvider(wallet.provider);
  if (!isCorrected()) {
    if (v.state === 'Connected' || v.state === 'Ready') {
      const latestBlock = await wallet.provider?.getBlock('latest');
      if (latestBlock) {
        correctTime(latestBlock.timestamp);
      }
    }
  }
});

fallback.subscribe(async (v) => {
  if (!isCorrected()) {
    if (v.state === 'Connected' || v.state === 'Ready') {
      const latestBlock = await wallet.provider?.getBlock('latest');
      if (latestBlock) {
        correctTime(latestBlock.timestamp);
      }
    }
  }
});

let lastAddress: string | undefined;
wallet.subscribe(async ($wallet) => {
  if (lastAddress !== $wallet.address) {
    lastAddress = $wallet.address;
    Sentry.setUser({address: $wallet.address});
  }
});

// TODO remove
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).walletStores = walletStores;
  (window as any).get = get;
}

chainTempo.startOrUpdateProvider(wallet.provider);

contractsInfos.subscribe(async ($contractsInfo) => {
  await chain.updateContracts(convertContractsInfo($contractsInfo));
});

export async function switchChain() {
  let blockExplorerUrls: string[] | undefined;
  const explorerTXURL = import.meta.env.VITE_BLOCK_EXPLORER_TRANSACTION as string;
  if (explorerTXURL && explorerTXURL.startsWith('https')) {
    const url = explorerTXURL.slice(0, explorerTXURL.length - (explorerTXURL.endsWith('/') ? 3 : 2));
    blockExplorerUrls = [url];
  }
  const rpcUrls = [];
  if (webWalletURL) {
    rpcUrls.push(webWalletURL);
  }
  if (fallbackProviderOrUrl && webWalletURL !== fallbackProviderOrUrl) {
    rpcUrls.push(fallbackProviderOrUrl);
  }

  await chain.switchChain(chainId, {
    chainName,
    rpcUrls,
    blockExplorerUrls,
    nativeCurrency: {
      name: nativeTokenName,
      symbol: nativeTokenSymbol,
      decimals: nativeTokenDecimal,
    },
  });
}
