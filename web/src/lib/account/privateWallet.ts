import {chain, flow, wallet} from '$lib/blockchain/wallet';
// import localCache from '$lib/utils/localCache';
import lstorage from '$lib/utils/lstorage'; // need sync see below
import {nameForChainId} from '$lib/utils/networks';
import type {Contract} from '@ethersproject/contracts';
import {keccak256} from '@ethersproject/solidity';
import {Wallet} from '@ethersproject/wallet';
import aes from 'aes-js';
import {writable} from 'svelte/store';
import type {Readable, Writable} from 'svelte/store';

// TODO tweetnacl do not work with vite
// import {sign} from 'tweetnacl';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nacl = (typeof window !== 'undefined' ? (window as any).nacl : {}) as any;

type MessagingKey = {secretKey: Uint8Array; publicKey: Uint8Array};

export type PrivateWalletState = {
  step: 'IDLE' | 'CONNECTING' | 'SIGNATURE_REQUIRED' | 'SIGNATURE_REQUESTED' | 'READY';
  syncEnabled: boolean;
  signer?: Wallet;
  missivPrivateKey?: `0x${string}`;
  aesKey?: Uint8Array;
  messagingKey?: MessagingKey;
  signingKey?: MessagingKey;
  ownerAddress?: string;
  chainId?: string;
};

type Contracts = {
  [name: string]: Contract;
};

const LOCAL_ONLY_STORAGE = '_local_only_';
function LOCAL_ONLY_STORAGE_KEY(address: string, chainId: string) {
  return `${LOCAL_ONLY_STORAGE}_${address.toLowerCase()}_${chainId}`;
}

class PrivateWallet implements Readable<PrivateWalletState> {
  private state: PrivateWalletState;
  private store: Writable<PrivateWalletState>;

  private cache: {
    [ownerAddress_chainId: string]: {
      signer: Wallet;
      aesKey: Uint8Array;
      messagingKey: MessagingKey;
      signingKey: MessagingKey;
      syncEnabled: boolean;
      missivPrivateKey: `0x${string}`;
    };
  } = {};

  private _promise: Promise<void> | undefined;
  private _resolve: (() => void) | undefined;
  private _reject: ((error: unknown) => void) | undefined;
  private _func: (() => Promise<void>) | undefined;
  private _contracts: Contracts | undefined;

  private stopWalletSubscription: (() => void) | undefined = undefined;
  private stopChainSubscription: (() => void) | undefined = undefined;
  private lastChainId: string | undefined = undefined;
  private lastWalletAddress: string | undefined = undefined;

  constructor() {
    this.state = {
      step: 'IDLE',
      syncEnabled: true,
    };
    this.store = writable(this.state, this._start.bind(this));
  }

  public get signer(): Wallet | undefined {
    return this.state.signer;
  }

  subscribe(run: (value: PrivateWalletState) => void, invalidate?: (value?: PrivateWalletState) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }

  login(): Promise<{signer: Wallet; contracts: Contracts}> {
    return this.execute();
  }

  execute(
    func?: (signer: Wallet, contracts: Contracts) => Promise<void>
  ): Promise<{signer: Wallet; contracts: Contracts}> {
    if (this._promise) {
      return this._promise.then(() => {
        return {contracts: this._contracts as Contracts, signer: this.state.signer};
      }); // TODO check _contracts undefined case ?
    }

    if (this.state.step !== 'READY') {
      this.state.step = 'CONNECTING';
      this._notify();
    }

    const p = flow.execute((contracts: Contracts): Promise<void> => {
      if (this.state.step !== 'READY') {
        this.state.step = 'SIGNATURE_REQUIRED';
        this._notify();

        this._promise = new Promise<void>((resolve, reject) => {
          this._contracts = contracts;
          this._resolve = resolve;
          this._reject = reject;
          if (func) {
            this._func = () => func(this.state.signer, contracts);
          }
        });
        return this._promise;
      }
      if (func) {
        return func(this.state.signer, contracts);
      } else {
        return Promise.resolve();
      }
    });

    return p.then((contracts) => {
      return {signer: this.state.signer, contracts};
    });
  }

  async confirm({
    storeSignatureLocally,
    syncRemotely,
  }: {
    storeSignatureLocally: boolean;
    syncRemotely: boolean;
  }): Promise<void> {
    if (this.state.step !== 'SIGNATURE_REQUIRED') {
      throw new Error(`confirm can only be executed when on step: "SIGNATURE_REQUIRED"`);
    }
    this.state.step = 'SIGNATURE_REQUESTED';
    this._notify();

    if (!wallet.provider) {
      return this.cancel(false, new Error(`no wallet.provider`));
    }
    if (!wallet.address) {
      return this.cancel(false, new Error(`no wallet.address`));
    }
    if (!wallet.chain.chainId) {
      return this.cancel(false, new Error(`no chainId, not connected?`));
    }
    const chainId = wallet.chain.chainId;
    const chainName = nameForChainId(chainId);
    try {
      const walletAddressLC = wallet.address.toLowerCase();

      const signature = await wallet.provider
        .getSigner()
        .signMessage(`Only sign this message on "conquest.eth" or other trusted frontend.\nThis is for ${chainName}`);
      const {signer, aesKey, messagingKey, signingKey, missivPrivateKey} = await this._generateKeys(signature);
      this.cache[walletAddressLC + '_' + chainId] = {
        signer,
        aesKey,
        messagingKey,
        signingKey,
        syncEnabled: syncRemotely,
        missivPrivateKey,
      };

      const toStorage = JSON.stringify({
        signature: storeSignatureLocally ? signature : undefined,
        syncEnabled: syncRemotely,
      });
      lstorage.setItem(LOCAL_ONLY_STORAGE_KEY(walletAddressLC, chainId), toStorage);

      this.state.step = 'READY';
      this.state.syncEnabled = syncRemotely;
      this.state.signer = signer;
      this.state.missivPrivateKey = missivPrivateKey;
      this.state.aesKey = aesKey;
      this.state.messagingKey = messagingKey;
      this.state.signingKey = signingKey;
      this.state.ownerAddress = wallet.address;
      this.state.chainId = chainId;
      this._notify();

      if (this._func) {
        await this._func();
      }
    } catch (e) {
      // console.error(e);
      return this.cancel(e);
    }
    this._resolve && this._resolve();
    this._resolve = undefined;
    this._reject = undefined;
    this._promise = undefined;
    this._contracts = undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cancel(reset = false, error?: any): void {
    flow.cancel();
    if (reset) {
      this._clear(false);
    }

    if (error) {
      this._reject && this._reject(error);
    }
    this._resolve = undefined;
    this._reject = undefined;
    this._promise = undefined;
    this._contracts = undefined;
  }

  private _start(): () => void {
    this.stopWalletSubscription = wallet.subscribe(async ($wallet) => {
      if (this.lastWalletAddress === $wallet.address) {
        return;
      }
      // console.log({walletAddress: $wallet.address, lastChainId: this.lastChainId});
      this.lastWalletAddress = $wallet.address;
      if (this.lastChainId) {
        await this._handleWalletAndChainChange(this.lastWalletAddress, this.lastChainId);
      }
    });
    this.stopChainSubscription = chain.subscribe(async ($chain) => {
      if (this.lastChainId === $chain.chainId) {
        return;
      }
      // console.log({chainId: $chain.chainId, lastWalletAddress: this.lastWalletAddress});
      this.lastChainId = $chain.chainId;
      if (this.lastWalletAddress) {
        await this._handleWalletAndChainChange(this.lastWalletAddress, this.lastChainId);
      }
    });
    return this._stop.bind(this);
  }

  private async _handleWalletAndChainChange(walletAddress?: string, chainId?: string): Promise<void> {
    console.log(`_handleWalletAndChainChange(${walletAddress}, ${chainId})`);
    if (!walletAddress || !chainId) {
      this._clear();
      return;
    }
    const walletAddressLC = walletAddress.toLowerCase();
    const ownerAddressLC = this.state.ownerAddress ? this.state.ownerAddress.toLowerCase() : undefined;
    if (walletAddressLC !== ownerAddressLC || this.state.chainId !== chainId) {
      this._clear(true);
      let inCache = this.cache[walletAddressLC + '_' + chainId];
      if (!inCache) {
        const fromStorage = lstorage.getItem(LOCAL_ONLY_STORAGE_KEY(walletAddressLC, chainId)); // NEED TO BE SYNCHRONOUS
        if (fromStorage) {
          let storage: {syncEnabled: boolean; signature?: string} | undefined;
          try {
            storage = JSON.parse(fromStorage);
          } catch (e) {
            console.error(e);
          }
          if (storage) {
            const signature = storage.signature;
            const syncEnabled = storage.syncEnabled;
            if (signature) {
              // TODO loading ?
              const {signer, aesKey, messagingKey, signingKey, missivPrivateKey} = await this._generateKeys(signature);
              inCache = this.cache[walletAddressLC + '_' + chainId] = {
                signer,
                aesKey,
                messagingKey,
                signingKey,
                syncEnabled,
                missivPrivateKey,
              };
            } else {
              this.state.syncEnabled = storage.syncEnabled;
              this.state.ownerAddress = walletAddress;
              this.state.chainId = chainId;
              this._notify();
            }
          } else {
            this.state.ownerAddress = walletAddress;
            this._notify();
          }
        } else {
          this.state.ownerAddress = walletAddress;
          this._notify();
        }
      }

      if (inCache) {
        this.state.step = 'READY';
        this.state.syncEnabled = inCache.syncEnabled;
        this.state.signer = inCache.signer;
        this.state.missivPrivateKey = inCache.missivPrivateKey;
        this.state.aesKey = inCache.aesKey;
        this.state.messagingKey = inCache.messagingKey;
        this.state.signingKey = inCache.signingKey;
        this.state.ownerAddress = walletAddress;
        this.state.chainId = chainId;

        this._resolve && this._resolve();
        this._resolve = undefined;
        this._reject = undefined;
        this._promise = undefined;
        this._contracts = undefined;

        this._notify();
      }
    }
  }

  private _clear(all = true, notify = true): void {
    this.state.step = 'IDLE';
    if (all) {
      this.state.syncEnabled = true;
    }
    this.state.signer = undefined;
    this.state.aesKey = undefined;
    this.state.messagingKey = undefined;
    this.state.signingKey = undefined;
    this.state.ownerAddress = undefined;
    this.state.chainId = undefined;
    if (notify) {
      this._notify();
    }
  }

  private _stop(): void {
    if (this.stopWalletSubscription) {
      this.stopWalletSubscription();
      this.stopWalletSubscription = undefined;
    }
    if (this.stopChainSubscription) {
      this.stopChainSubscription();
      this.stopChainSubscription = undefined;
    }
  }

  private _notify(): void {
    this.store.set(this.state);
  }

  getState() {
    return this.state;
  }

  async _generateKeys(signature: string): Promise<{
    signer: Wallet;
    aesKey: Uint8Array;
    messagingKey: MessagingKey;
    signingKey: MessagingKey;
    missivPrivateKey: `0x${string}`;
  }> {
    const missivPrivateKey = signature.slice(0, 66) as `0x${string}`;
    const signer = new Wallet(missivPrivateKey);
    const aesKeySignature = await signer.signMessage('AES KEY');
    const aesKey = aes.utils.hex.toBytes(aesKeySignature.slice(2, 66)); // TODO mix ?
    const messagingKey = nacl.box.keyPair.fromSecretKey(
      new Uint8Array(
        signature
          .slice(2, 66)
          .match(/.{1,2}/g)
          .map((byte) => parseInt(byte, 16))
      )
    );
    const signingKey = nacl.sign.keyPair.fromSeed(messagingKey.secretKey);
    return {signer, aesKey, messagingKey, signingKey, missivPrivateKey};
  }

  hashString() {
    if (!this.state.signer) {
      throw new Error(`no signer`);
    }
    // TODO cache
    return keccak256(
      ['bytes32', 'bytes32'],
      [this.state.signer.privateKey.slice(0, 66), '0x' + this.state.signer.privateKey.slice(66, 130)]
    );
  }
}

export const privateWallet = new PrivateWallet();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).privateWallet = privateWallet;
}
