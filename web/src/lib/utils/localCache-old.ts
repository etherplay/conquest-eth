import {base} from '$app/paths';
import {initialContractsInfos as contractsInfos} from '$lib/blockchain/contracts';

class LocalCache {
  private _prefix: string;
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
      localStorage.setItem(this._prefix + key, value);
    } catch (e) {
      //
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this._prefix + key);
    } catch (e) {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(this._prefix + key);
    } catch (e) {
      //
    }
  }

  async clear(): Promise<void> {
    try {
      const l = localStorage.length;
      const keys = [];
      for (let i = 0; i < l; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(this._prefix) || key.startsWith('_web3w_')) {
          keys.push(key);
        }
      }
      for (const key of keys) {
        try {
          console.log(`removing ${key}...`);
          localStorage.removeItem(key);
        } catch (e) {
          // console.error('removeITem', e);
        }
      }
    } catch (e) {}
  }
}

export default new LocalCache(
  contractsInfos.contracts.OuterSpace.address +
    (contractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
      ? ':' + contractsInfos.contracts.OuterSpace.linkedData.chainGenesisHash
      : '')
);
