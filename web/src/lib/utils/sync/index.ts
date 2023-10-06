import type {Wallet} from '@ethersproject/wallet';
import {BigNumber} from '@ethersproject/bignumber';
import aes from 'aes-js';
import {base64, compressToUint8Array, decompressFromUint8Array} from '$lib/utils';
import localCache from '$lib/utils/localCache';
import {writable} from 'svelte/store';
import type {Readable, Writable} from 'svelte/store';

const LOCAL_STORAGE_PRIVATE_ACCOUNT = '_account';
function LOCAL_STORAGE_KEY(address: string, chainId: string) {
  return `${LOCAL_STORAGE_PRIVATE_ACCOUNT}_${address.toLowerCase()}_${chainId}`;
}

export type SyncingState<T> = {
  data?: T;
  // syncing: boolean;
  remoteFetchedAtLeastOnce: boolean;
  remoteSyncEnabled: boolean;
  error?: unknown;
};

export class AccountDB<T extends Record<string, unknown>> implements Readable<SyncingState<T>> {
  private _lastId = 1;
  private state: SyncingState<T>;
  private store: Writable<SyncingState<T>>;
  private _lastSyncTime: number | undefined;
  private _syncDelay: NodeJS.Timeout | undefined;

  // private destroyed = false;
  constructor(
    public readonly ownerAddress: string,
    public readonly chainId: string,
    private syncURI: string,
    private dbName: string,
    private wallet: Wallet,
    private aesKey: Uint8Array,
    private merge: (localData?: T, remoteData?: T) => {newData: T; newDataOnLocal: boolean; newDataOnRemote: boolean},
    remoteSyncEnabled: boolean
  ) {
    this.state = {
      data: undefined,
      // syncing: false,
      remoteFetchedAtLeastOnce: false,
      remoteSyncEnabled,
    };
    this.store = writable(this.state);
  }

  subscribe(run: (value: SyncingState<T>) => void, invalidate?: (value?: SyncingState<T>) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }

  _syncNow() {
    console.log(`SYNC: _syncNow`);
    this._syncDelay = undefined;
    this._syncRemote();
  }

  _syncLater() {
    if (!this._syncDelay) {
      if (this._lastSyncTime && performance.now() - this._lastSyncTime < 1000) {
        this._syncDelay = setTimeout(this._syncNow.bind(this), 1000);
      } else {
        console.log(`SYNC: _syncRemote now`);
        this._syncRemote();
      }
    } else {
      console.log(`SYNC: _skip`);
    }
  }

  async save(data: T): Promise<void> {
    this.state.data = data;
    const notified = await this._syncLocal();
    if (!notified) {
      this._notify('save');
    }

    console.log(`SYNC: _syncLater after save`);
    this._syncLater();
  }

  async requestSync(): Promise<void> {
    const notified = await this._syncLocal();
    if (!notified) {
      this._notify('requestSync');
    }
    this._syncRemote();
  }

  async clearData(): Promise<void> {
    this.state.data = {} as T;
    await this._saveToLocalStorage(this.ownerAddress, this.chainId, this.state.data);

    let error: unknown | undefined = undefined;
    let counter: BigNumber | undefined;
    try {
      const remoteResult = await this._fetchRemoteData();
      counter = remoteResult.counter;
    } catch (e) {
      console.error(e);
      error = e;
    }

    if (!error) {
      this._postToRemote(this.state.data, counter);
    }

    // this.state.syncing = false;
    this._notify('clearData');
  }

  private async _syncRemote(): Promise<void> {
    this._lastSyncTime = performance.now();
    if (!this.state.remoteSyncEnabled) {
      return;
    }
    // this.state.syncing = true;
    // this._notify('_syncRemote, syncing: true');

    let error: unknown | undefined = undefined;
    let remoteData: T;
    let counter: BigNumber | undefined;
    try {
      const remoteResult = await this._fetchRemoteData();
      remoteData = remoteResult.data;
      counter = remoteResult.counter;
    } catch (e) {
      console.error(e);
      error = e;
    }

    if (!error && remoteData) {
      const {newData, newDataOnLocal, newDataOnRemote} = this.merge(this.state.data, remoteData);
      if (newDataOnRemote) {
        this.state.data = newData;
        const notified = await this._syncLocal();
        if (!notified) {
          this._notify('_syncRemote, _syncLocal');
        }
      }
      if (newDataOnLocal) {
        this._postToRemote(this.state.data, counter);
      }
      this.state.remoteFetchedAtLeastOnce = true;
    }

    // this.state.syncing = false;
    // this._notify('_syncRemote, syncing: false');
  }

  private async _syncLocal(): Promise<boolean> {
    let notified = false;
    const localStorageAsRemoteData = await this._getFromLocalStorage();
    const {newData, newDataOnLocal, newDataOnRemote} = this.merge(this.state.data, localStorageAsRemoteData);
    if (!this.state.data) {
      this.state.data = newData;
    }
    if (newDataOnRemote) {
      this.state.data = newData;
      this._notify('_syncLocal: newDataOnRemote');
      notified = true;
    }
    if (newDataOnLocal) {
      await this._saveToLocalStorage(this.ownerAddress, this.chainId, this.state.data);
    }
    return notified;
  }

  // destroy(): void {
  //   this.destroyed = true;
  // }

  private async _getFromLocalStorage(): Promise<T | undefined> {
    const fromStorage = await localCache.getItem(LOCAL_STORAGE_KEY(this.ownerAddress, this.chainId));
    if (fromStorage) {
      try {
        const decrypted = this._decrypt(fromStorage);
        return JSON.parse(decrypted);
      } catch (e) {
        console.error(e);
      }
    }
    return undefined;
  }

  private async _saveToLocalStorage(address: string, chainId: string, data: T): Promise<void> {
    const toStorage = JSON.stringify(data);
    const encrypted = this._encrypt(toStorage);
    await localCache.setItem(LOCAL_STORAGE_KEY(address, chainId), encrypted);
  }

  private async _fetchRemoteData(): Promise<{data: T; counter: BigNumber}> {
    let response: Response;
    try {
      response = await this._syncRequest('wallet_getString', [this.wallet.address, this.dbName]);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const json = await response.json();
    if (json.error) {
      throw new Error(json.error); // TODO retry before throw
    }
    let data: T;
    if (json.result.data && json.result.data !== '') {
      try {
        const decryptedData = this._decrypt(json.result.data);
        data = JSON.parse(decryptedData);
      } catch (e) {
        console.error(e);
        throw new Error(e);
      }
    } else {
      data = {} as T;
    }
    return {data, counter: BigNumber.from(json.result.counter)};
  }

  private async _postToRemote(data: T, syncDownCounter: BigNumber): Promise<void> {
    const dataToEncrypt = JSON.stringify(data);
    const encryptedData = this._encrypt(dataToEncrypt);

    const counter = syncDownCounter.add(1).toString();
    const signature = await this.wallet.signMessage('put:' + this.dbName + ':' + counter + ':' + encryptedData);

    let json;
    let error;
    try {
      const response = await this._syncRequest('wallet_putString', [
        this.wallet.address,
        this.dbName,
        counter,
        encryptedData,
        signature,
      ]);
      json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
    } catch (e) {
      error = e;
    }
    if (error || json.error) {
      console.error(error || json.error);
      return; // TODO retry ?
    }
    if (!json.result || !json.result.success) {
      console.error('sync no success', json);
      return; // TODO retry ?
    } else {
      // console.log('synced!');
    }
  }

  private async _syncRequest(method: string, params: string[]): Promise<Response> {
    return fetch(this.syncURI, {
      // TODO env variable
      method: 'POST',
      body: JSON.stringify({
        method,
        params,
        jsonrpc: '2.0',
        id: ++this._lastId,
      }),
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
    });
  }

  private _encrypt(data: string): string {
    const textBytes = compressToUint8Array(data); // const textBytes = aes.utils.utf8.toBytes(data);
    const ctr = new aes.ModeOfOperation.ctr(this.aesKey);
    const encryptedBytes = ctr.encrypt(textBytes);
    return base64.bytesToBase64(encryptedBytes);
  }

  private _decrypt(data: string): string {
    const encryptedBytes = base64.base64ToBytes(data);
    const ctr = new aes.ModeOfOperation.ctr(this.aesKey);
    const decryptedBytes = ctr.decrypt(encryptedBytes);
    return decompressFromUint8Array(decryptedBytes) || ''; // return aes.utils.utf8.fromBytes(decryptedBytes);
  }

  private _notify(message: string): void {
    console.log(`AccountDB:notify: ${message}`);
    this.store.set(this.state);
  }
}
