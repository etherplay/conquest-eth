import type {AccountState} from '$lib/account/account';
import {account} from '$lib/account/account';
import {wallet} from '$lib/blockchain/wallet';
import {fallbackProviderOrUrl, shouldDropTransactions, dropTransactions} from '$lib/config';

const txsSeen: {[txHash: string]: boolean} = {};

export function initDebug(): void {
  account.subscribe(($account) => {
    // console.log({shouldDropTransactions: shouldDropTransactions()});
    if (shouldDropTransactions()) {
      dropAllTransactionsIfPossible();
    }
  });
}

async function dropAllTransactionsIfPossible() {
  if (wallet.provider) {
    const pendingActions = ((account as any).state as AccountState).data?.pendingActions;
    if (pendingActions) {
      for (const txHash of Object.keys(pendingActions)) {
        if (txsSeen[txHash]) {
          continue;
        }
        txsSeen[txHash] = true;
        const url =
          typeof fallbackProviderOrUrl === 'string' && fallbackProviderOrUrl !== ''
            ? fallbackProviderOrUrl
            : 'http://127.0.0.1:8545'; // TODO ?
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: Math.floor(Math.random() * 99999999),
              jsonrpc: '2.0',
              method: 'hardhat_ignoreTransaction',
              params: [txHash],
            }),
          });
          try {
            const json = await response.json();
            console.log(JSON.stringify(json));
          } catch (e) {
            console.log(await response.text());
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).debug = {
    dropTransactions,
  };
}
