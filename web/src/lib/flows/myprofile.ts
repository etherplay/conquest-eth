import {BaseStoreWithData} from '$lib/utils/stores/base';
import {wallet} from '$lib/blockchain/wallet';
import {base64} from '$lib/utils';
import {privateWallet} from '$lib/account/privateWallet';
import {account} from '$lib/account/account';
import {TutorialSteps} from '$lib/account/constants';
import claimFlow from './claim';

// TODO tweetnacl do not work with vite
// import {sign} from 'tweetnacl';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nacl = (typeof window !== 'undefined' ? (window as any).nacl : {}) as any;

// TODO remove duplication, abstract away profile sync but also sync in general
const PROFILE_URI = import.meta.env.VITE_PROFILE_URI as string;

export type ProfileFlow = {
  type: 'MY_PROFILE';
  step: 'IDLE' | 'LOADING' | 'READY';
  owner?: string;
  account?: {
    description?: string;
    nonceMsTimestamp: number;
  };
  error?: {message?: string};
};

class MyProfileFlowStore extends BaseStoreWithData<ProfileFlow, undefined> {
  public constructor() {
    super({
      type: 'MY_PROFILE',
      step: 'IDLE',
    });

    wallet.subscribe(($wallet) => {
      if ($wallet.address?.toLowerCase() !== this.$store.owner?.toLowerCase()) {
        this.setPartial({
          step: 'IDLE',
          owner: undefined,
          account: undefined,
        });
      }
      if ($wallet.address) {
        this.getProfile($wallet.address);
      }
    });
  }

  async getProfile(owner: string) {
    if (this.$store.step !== 'READY') {
      this.setPartial({step: 'LOADING', owner});
    }
    try {
      const response = await fetch(`${PROFILE_URI}get/${owner}`, {
        method: 'GET',
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
      const json = await response.json();
      const result: {
        account: {
          description?: string;
          publicEncryptionKey: string;
          publicSigningKey: string;
          nonceMsTimestamp: number;
        } | null;
      } = json;
      // TODO check signature

      this.setPartial({step: 'READY', owner, account: result.account});
    } catch (e) {
      this.setPartial({error: e});
    }
  }

  async setProfile(data: {description: string}) {
    const {description} = data;
    const walletAddress = this.$store.owner;
    await this.getProfile(walletAddress);
    const account = this.$store.account;

    const privateState = privateWallet.getState();

    const signedMessage = base64.bytesToBase64(
      nacl.sign(
        base64.base64ToBytes(
          base64.base64encode(
            JSON.stringify({
              description,
              nonceMsTimestamp: account ? account.nonceMsTimestamp + 1 : 0,
            })
          )
        ),
        privateState.signingKey.secretKey
      )
    );

    if (!account) {
      const publicEncryptionKey = base64.bytesToBase64(privateState.messagingKey.publicKey);
      const publicSigningKey = base64.bytesToBase64(privateState.signingKey.publicKey);
      const signature = await wallet.provider
        .getSigner()
        .signMessage(
          `My Public Encryption Key is ${publicEncryptionKey}\nMy Public Signing Key is ${publicSigningKey}\n`
        );

      const registration = {
        publicEncryptionKey,
        publicSigningKey,
        signature,
        update: {
          signedMessage,
        },
      };
      const response = await fetch(`${PROFILE_URI}register/${walletAddress}`, {
        method: 'POST',
        body: JSON.stringify(registration),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
      const json = await response.json();
      console.log(json);
    } else {
      const update = {
        signedMessage,
      };
      await fetch(`${PROFILE_URI}save/${walletAddress}`, {
        method: 'POST',
        body: JSON.stringify(update),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
    }
    await this.getProfile(walletAddress);

    if (description) {
      this.recordTutorial();
    }
  }

  recordTutorial() {
    claimFlow.acknowledgeProfileSuggestion();
  }

  async cancel(): Promise<void> {
    this._reset();
  }

  async acknownledgeSuccess(): Promise<void> {
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  private _reset() {
    this.setPartial({step: 'IDLE', owner: undefined});
  }
}

export default new MyProfileFlowStore();
