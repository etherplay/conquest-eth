import {missivDomain} from '$lib/config';
import {conversations} from '$lib/missiv';
import {BaseStoreWithData} from '$lib/utils/stores/base';

export type MessageFlow = {
  type: 'MESSAGE';
  step: 'IDLE' | 'LOADING' | 'READY';
  owner?: string;
  profile?: {
    description?: string;
    domainDescription?: string;
  };
  error?: {message?: string};
};

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
      const {completeUser} = await conversations.getUser({
        domain: missivDomain,
        address: owner.toLowerCase(),
      });

      if (!completeUser) {
        // fallback case to let people connect to player we used the old account-service and where still present on the switch
        if (owner.toLowerCase() === '0x4b9d53246ed18db31f26fc59b6e47a9efc3c1213') {
          this.setPartial({step: 'READY', owner, profile: {domainDescription: 'LukaskywaIker'}});
          return;
        } else if (owner.toLowerCase() === '0x88c0558cb8525c88f78752bb0bdc3e6221597165') {
          this.setPartial({step: 'READY', owner, profile: {domainDescription: 'anar'}});
          return;
        }
      }

      console.log(completeUser);
      this.setPartial({step: 'READY', owner, profile: completeUser});
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
