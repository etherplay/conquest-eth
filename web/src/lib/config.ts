import {getDefaultProvider, Provider} from '@ethersproject/providers';
import {initialContractsInfos as contractsInfos} from './blockchain/contracts';
import {nameForChainId} from './utils/networks';
import {getParamsFromLocation, getHashParamsFromLocation} from './utils/web';

import * as Sentry from '@sentry/browser';
import {Integrations} from '@sentry/tracing';
import {RewriteFrames as RewriteFramesIntegration} from '@sentry/integrations';

let root = undefined;
if (typeof window !== 'undefined') {
  root = window.location.protocol + '//' + window.location.host + (window as any).BASE;
}
console.log(`VERSION: ${__VERSION__}`);

export const hashParams = getHashParamsFromLocation();
export const {params} = getParamsFromLocation();
// export const VERSION = '1';

const chainId = import.meta.env.VITE_CHAIN_ID as string;
let fallbackProviderOrUrl: string | Provider | undefined;
let finality = 12;
let blockTime = 15;
let nativeTokenSymbol = 'ETH';
let nativeTokenName = 'ETH';
let nativeTokenDecimal = 18;
let defaultTopupValueInEth = 0.07;
let roundTo1Decimal = (contractsInfos.contracts.OuterSpace.linkedData as any).roundTo1Decimal;

if (chainId !== '1') {
  finality = 5; // TODO
  blockTime = 10;
  nativeTokenSymbol = 'ETH'; // TODO
}

if (chainId === '5') {
  finality = 8; // TODO
  blockTime = 15;
  nativeTokenSymbol = 'ETH';
}

if (chainId === '100') {
  finality = 8; // TODO
  blockTime = 5;
  nativeTokenSymbol = 'XDAI';
  nativeTokenName = 'XDAI';
  nativeTokenDecimal = 18;
  defaultTopupValueInEth = 0.9;
}

if (chainId === '846') {
  finality = 8; // TODO
  blockTime = 5;
  nativeTokenSymbol = 'ACE';
  nativeTokenName = 'ACE';
  nativeTokenDecimal = 18;
  defaultTopupValueInEth = 0.9;
}

if (chainId === '7001' || chainId === '7001') {
  finality = 8; // TODO
  blockTime = 5;
  nativeTokenSymbol = 'ZETA';
  nativeTokenName = 'ZETA';
  nativeTokenDecimal = 18;
}

if (chainId === '42220' || chainId === '11142220') {
  finality = 8; // TODO
  blockTime = 2;
  nativeTokenSymbol = 'CELO';
  nativeTokenName = 'CELO';
  nativeTokenDecimal = 18;
}

if (chainId === '143' || chainId === '10143') {
  finality = 8; // TODO
  blockTime = 1;
  nativeTokenSymbol = 'MON';
  nativeTokenName = 'MON';
  nativeTokenDecimal = 18;
}

let defaultRPCURL = import.meta.env.VITE_DEFAULT_RPC_URL as string | undefined;

let webWalletURL: string | undefined = import.meta.env.VITE_WEB_WALLET_ETH_NODE as string | undefined;
if (webWalletURL && webWalletURL.startsWith('__')) {
  webWalletURL = undefined;
}

let localDev = false;
if (chainId === '1337' || chainId === '31337') {
  localDev = true;
  fallbackProviderOrUrl = import.meta.env.VITE_ETH_NODE_URI_LOCALHOST as string;
  if (fallbackProviderOrUrl && fallbackProviderOrUrl.startsWith('__')) {
    fallbackProviderOrUrl = undefined;
  }
  let webWalletURLFromENV = import.meta.env.VITE_WEB_WALLET_ETH_NODE_LOCALHOST as string;
  if (webWalletURLFromENV && webWalletURLFromENV.startsWith('__')) {
    webWalletURLFromENV = undefined;
  }
  if (webWalletURLFromENV) {
    webWalletURL = webWalletURLFromENV;
  }

  // const localEthNode = import.meta.env.VITE_ETH_NODE_URI_LOCALHOST as string;
  // if (localEthNode && localEthNode !== '') {
  //   fallbackProviderOrUrl = localEthNode;
  // } else {
  //   fallbackProviderOrUrl = 'http://127.0.0.1:8545';
  // }
  finality = 2;
  blockTime = 5;
}

const chainName = nameForChainId(chainId);

if (!fallbackProviderOrUrl) {
  const url = import.meta.env.VITE_ETH_NODE_URI as string; // TODO use query string to specify it // TODO settings
  if (url && url !== '' && !url.startsWith('__')) {
    fallbackProviderOrUrl = url;
  }
}

if (fallbackProviderOrUrl && typeof fallbackProviderOrUrl === 'string') {
  if (!fallbackProviderOrUrl.startsWith('http') && !fallbackProviderOrUrl.startsWith('ws')) {
    // if no http nor ws protocol, assume fallbackProviderOrUrl is the network name
    // use ethers fallback provider
    fallbackProviderOrUrl = getDefaultProvider(fallbackProviderOrUrl, {
      alchemy: import.meta.env.VITE_ALCHEMY_API_KEY || undefined,
      etherscan: import.meta.env.VITE_ETHERSCAN_API_KEY || undefined,
      infura: import.meta.env.VITE_INFURA_PROJECT_ID || undefined,
      pocket: import.meta.env.VITE_POCKET_APP_ID || undefined,
      quorum: 2,
    });
  } else {
    fallbackProviderOrUrl = getDefaultProvider(fallbackProviderOrUrl); // still use fallback provider but use the url as is
  }
}

const graphNodeURL = params.subgraph || (import.meta.env.VITE_THE_GRAPH_HTTP as string);

const logPeriod =
  Math.floor((7 * 24 * 60 * 60) / contractsInfos.contracts.OuterSpace.linkedData.productionSpeedUp) *
  contractsInfos.contracts.OuterSpace.linkedData.productionSpeedUp;
const deletionDelay =
  Math.floor((7 * 24 * 60 * 60) / contractsInfos.contracts.OuterSpace.linkedData.productionSpeedUp) *
  contractsInfos.contracts.OuterSpace.linkedData.productionSpeedUp;

const lowFrequencyFetch = blockTime * 8;
const mediumFrequencyFetch = blockTime * 4;
const highFrequencyFetch = blockTime * 2;

const globalQueryParams = [
  'debug',
  'log',
  'subgraph',
  'ethnode',
  '_d_eruda',
  'sync',
  'agent-service',
  'logo',
  'errorButton',
  'options',
  'force',
  'lobsters',
];

const SYNC_URI = params.sync || (import.meta.env.VITE_SYNC_URI as string); //  'http://invalid.io'; // to emulate connection loss :)
const SYNC_DB_NAME =
  'conquest-' +
  contractsInfos.contracts.OuterSpace.address +
  (contractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
    ? ':' + contractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
    : '');

const MISSIV_URI = import.meta.env.VITE_MISSIV_URI as string;

const FUZD_URI = import.meta.env.VITE_FUZD_URI as string;

const lobstersFromParam = params['lobsters'] && params['lobsters'] != 'false';
const FOR_LOBSTERS =
  lobstersFromParam !== undefined ? lobstersFromParam : (import.meta.env.VITE_FOR_LOBSTERS as string);

console.log({SYNC_DB_NAME});

const AGENT_SERVICE_URL = params['agent-service'] || (import.meta.env.VITE_AGENT_SERVICE_URL as string); //  'http://invalid.io'; // to emulate connection loss :)

const BASIC_ALLIANCES_URL: string | undefined =
  (import.meta.env.VITE_BASIC_ALLIANCES_URL as string) || '../basic-alliances/';

let _dropTransactions = false;
function dropTransactions(yes: boolean): void {
  _dropTransactions = yes;
}

function shouldDropTransactions(): boolean {
  return _dropTransactions;
}

let getName = () => {
  return undefined;
};
function setGetName(func: () => string): void {
  getName = func;
}

const version = __VERSION__;

const options: {[option: string]: boolean} = {};
if (params['options']) {
  const splitted = params['options'].split(',');
  for (const split of splitted) {
    options[split] = true;
  }
}

if (import.meta.env.MODE === 'production') {
  Sentry.init({
    release: __VERSION__,
    dsn: 'https://3ce483b67b094d40a9ecece7ee1ba007@o43511.ingest.sentry.io/6056118',
    beforeSend(event, hint) {
      // Check if it is an exception, and if so, show the report dialog
      // if (event.exception) {
      //   console.error(`EXCEPTION`, event);
      //   Sentry.showReportDialog({eventId: event.event_id, user: {name: getName(), email: 'noone@nowhere.eth'}});
      // } else {
      //   console.error(`sentry event`, event);
      // }
      return event;
    },
    integrations: [
      new Integrations.BrowserTracing({
        tracingOrigins: ['localhost', /^\//], //, graphNodeURL.split('/')[0]], fails with "has been blocked by CORS policy: Request header field sentry-trace is not allowed by Access-Control-Allow-Headers in preflight response."
      }),
      new RewriteFramesIntegration({
        iteratee: (frame) => {
          if (frame.filename) {
            frame.filename = frame.filename.replace(root, '');
          }
          return frame;
        },
      }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 1.0,
  });
  console.log('SENTRY ENABLED');
  if (typeof window !== 'undefined') {
    (window as any).generateError = (message) => {
      const result = Sentry.captureMessage(message);
      console.log({result});
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function report(message: any) {
  try {
    Sentry.captureMessage(message);
  } catch (e) {
    console.error(`error reporting message : ${message}`, e);
  }
}

// domain is per game (actually per signing key, so could be per project owner)
const missivDomain = 'conquest.eth';
// namespace is used for differentiating messages across different environment
// use same signing key
const missivNamespace = contractsInfos.name;

export {
  FOR_LOBSTERS,
  FUZD_URI,
  MISSIV_URI,
  missivDomain,
  missivNamespace,
  BASIC_ALLIANCES_URL,
  roundTo1Decimal,
  defaultTopupValueInEth,
  finality,
  fallbackProviderOrUrl,
  webWalletURL,
  chainId,
  blockTime,
  chainName,
  nativeTokenSymbol,
  nativeTokenName,
  nativeTokenDecimal,
  graphNodeURL,
  logPeriod,
  lowFrequencyFetch,
  mediumFrequencyFetch,
  highFrequencyFetch,
  globalQueryParams,
  SYNC_URI,
  SYNC_DB_NAME,
  AGENT_SERVICE_URL,
  deletionDelay,
  shouldDropTransactions,
  dropTransactions,
  localDev,
  setGetName,
  version,
  options,
  report,
  defaultRPCURL,
};

if (typeof window !== 'undefined') {
  (window as any).env = import.meta.env;
}
