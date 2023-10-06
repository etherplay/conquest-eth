import {base} from '$app/paths';
import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';
import type {IDBPDatabase} from 'idb';
import {openDB} from 'idb';

class LocalCache {
  private _prefix: string;
  private _dbP: Promise<IDBPDatabase<unknown>>;
  constructor(version?: string) {
    this._prefix = (base && base.startsWith('/ipfs/')) || base.startsWith('/ipns/') ? base.slice(6) : '_c_'; // ensure local storage is not conflicting across web3w-based apps on ipfs gateways (require encryption for sensitive data)

    (async () => {
      const lastVersion = await this.getItem('_version');
      if (lastVersion !== version) {
        console.log('new version, clear old storage...', {lastVersion, version});
        await this.clear();
        if (version) {
          await this.setItem('_version', version);
        }
      }
    })();
  }
  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this._getDB();
      await db.put('keyval', value, this._prefix + key);
    } catch (e) {
      //
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this._getDB();
      return db.get('keyval', this._prefix + key);
    } catch (e) {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this._getDB();
      await db.delete('keyval', this._prefix + key);
    } catch (e) {
      //
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this._getDB();
      const keys = await db.getAllKeys('keyval');
      for (const key of keys) {
        if (typeof key === 'string' && key.startsWith(this._prefix)) {
          try {
            console.log(`removing ${key}...`);
            await db.delete('keyval', key);
          } catch (e) {
            //
          }
        }
      }
    } catch (e) {}
  }

  private _getDB(): Promise<IDBPDatabase<unknown>> {
    if (!this._dbP) {
      this._dbP = openDB('keyval-store', 1, {
        upgrade(db) {
          db.createObjectStore('keyval');
        },
      });
    }
    return this._dbP;
  }
}

const localCache = new LocalCache(
  contractsInfos.contracts.OuterSpace.address +
    (contractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
      ? ':' + contractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
      : '')
);

export default localCache;

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).localCache = localCache;
}
