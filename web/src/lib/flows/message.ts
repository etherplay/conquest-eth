import {BaseStoreWithData} from '$lib/utils/stores/base';

export type MessageFlow = {
  type: 'MESSAGE';
  step: 'IDLE' | 'LOADING' | 'READY';
  owner?: string;
  profile?: {
    description?: string;
  };
  error?: {message?: string};
};

const PROFILE_URI = import.meta.env.VITE_PROFILE_URI as string;

class MessageFlowStore extends BaseStoreWithData<MessageFlow, undefined> {
  public constructor() {
    super({
      type: 'MESSAGE',
      step: 'IDLE',
    });
  }

  async show(owner: string): Promise<void> {
    this.setPartial({step: 'LOADING', owner});
    try {
      // TODO CACHE data
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
      this.setPartial({step: 'READY', owner, profile: result.account});
    } catch (e) {
      this.setPartial({error: e});
    }
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

export default new MessageFlowStore();
