import {SYNC_DB_NAME, SYNC_URI, setGetName, deletionDelay} from '$lib/config';
import {bitMaskMatch} from '$lib/utils';
import type {SyncingState} from '$lib/utils/sync';
import {AccountDB} from '$lib/utils/sync';
import {xyToLocation} from 'conquest-eth-common';
import {writable} from 'svelte/store';
import type {Readable, Writable} from 'svelte/store';
import type {PrivateWalletState} from './privateWallet';
import {privateWallet} from './privateWallet';
import {keccak256} from '@ethersproject/solidity';
import type {MyEvent} from '$lib/space/myevents';
import {isCorrected, now, time} from '$lib/time';
import {wallet} from '$lib/blockchain/wallet';

export type AccountState = {
  step: 'IDLE' | 'READY';
  data?: AccountData;
  remoteDisabledOrSynced: boolean;
  syncError?: unknown;
  ownerAddress?: string;
};

type PlanetCoords = {x: number; y: number};

type PendingActionBase = {
  txOrigin?: string; // used if the controller is not owner
  timestamp: number;
  final?: {status: 'SUCCESS' | 'FAILURE' | 'CANCELED' | 'TIMEOUT'; timestamp: number};
  nonce: number;
  acknowledged?: 'ERROR' | 'SUCCESS'; // SUCCESS is that ever used ?
  acknowledgementTime?: number;
  external?: {status: 'SUCCESS'; final?: number};
  overrideTimestamp?: number;
};

export type PendingSend = PendingActionBase & {
  type: 'SEND';
  fleetId: string;
  from: PlanetCoords;
  to: PlanetCoords;
  gift: boolean;
  specific: string;
  potentialAlliances?: string[];
  quantity: number;
  arrivalTimeWanted: number;
  actualLaunchTime?: number;
  resolution?: string[];
  queueID?: string;
  fleetOwner: string;
  fleetSender?: string;
  operator?: string;
  walletAddress: string;
};

export type PendingResolution = PendingActionBase & {
  type: 'RESOLUTION';
  to: PlanetCoords;
  fleetId: string;
};

export type PendingExit = PendingActionBase & {
  type: 'EXIT';
  planetCoords: PlanetCoords;
};

export type PendingWithdrawal = PendingActionBase & {
  type: 'WITHDRAWAL';
  planets: PlanetCoords[];
};

export type PendingCapture = PendingActionBase & {
  type: 'CAPTURE';
  planetCoords: PlanetCoords;
};

export type PendingAction = PendingSend | PendingExit | PendingCapture | PendingWithdrawal | PendingResolution;

export type PendingActions = {[txHash: string]: PendingAction | number};

export type Acknowledgement = {timestamp: number; stateHash: string};

export type Acknowledgements = {[id: string]: Acknowledgement};

export type AccountData = {
  pendingActions: PendingActions;
  welcomingStep: number;
  acknowledgements: Acknowledgements;
  agentServiceDefault?: {activated: boolean; timestamp: number};
};

function mergeStringArrays(
  localArray?: string[],
  remoteArray?: string[]
): {newOnLocal: boolean; newOnRemote: boolean; newArray?: string[]} {
  let newOnLocal = false;
  let newOnRemote = false;
  const hasLocalArray = typeof localArray !== 'undefined';
  const hasRemoteArray = typeof remoteArray !== 'undefined';
  if (!hasLocalArray && !hasRemoteArray) {
  } else if (hasLocalArray && !hasRemoteArray) {
    newOnLocal = true;
  } else if (!hasLocalArray && hasRemoteArray) {
    newOnRemote = true;
    localArray = remoteArray;
  } else {
    for (let i = 0; i < localArray.length; i++) {
      if (remoteArray.indexOf(localArray[i]) === -1) {
        newOnLocal = true;
      }
    }
    for (let i = 0; i < remoteArray.length; i++) {
      if (localArray.indexOf(remoteArray[i]) === -1) {
        newOnRemote = true;
        localArray.push(remoteArray[i]);
      }
    }
  }
  return {newOnLocal, newOnRemote, newArray: localArray};
}

class Account implements Readable<AccountState> {
  private state: AccountState;
  private store: Writable<AccountState>;

  private stopPrivateWalletSubscription: (() => void) | undefined = undefined;
  private accountDB: AccountDB<AccountData> | undefined;
  private unsubscribeFromSync: () => void;

  private deletedPendingActions: string[] = [];

  constructor() {
    this.state = {
      step: 'IDLE',
      data: undefined,
      remoteDisabledOrSynced: false,
    };
    this.store = writable(this.state, this._start.bind(this));
  }

  subscribe(run: (value: AccountState) => void, invalidate?: (value?: AccountState) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }

  async recordWelcomingStep(bit: number): Promise<void> {
    this.check();
    if (bit > 32) {
      throw new Error('bit > 32');
    }
    this.state.data.welcomingStep = (this.state.data.welcomingStep || 0) | Math.pow(2, bit);
    await this.accountDB.save(this.state.data);
  }

  isWelcomingStepCompleted(bit: number): boolean {
    return bitMaskMatch(this.state.data?.welcomingStep, bit);
  }

  async recordAgentServiceDefault(activated: boolean): Promise<void> {
    this.check();
    this.state.data.agentServiceDefault = this.state.data.agentServiceDefault || {activated: true, timestamp: 0};
    this.state.data.agentServiceDefault.activated = activated;
    this.state.data.agentServiceDefault.timestamp = now();
    await this.accountDB.save(this.state.data);
    this._notify('recordAgentServiceDefault');
  }

  isAgentServiceActivatedByDefault(): boolean {
    return !this.state.data?.agentServiceDefault || this.state.data?.agentServiceDefault?.activated;
  }

  async recordCapture(planetCoords: PlanetCoords, txHash: string, timestamp: number, nonce: number): Promise<void> {
    this.check();
    this.state.data.pendingActions[txHash] = {
      type: 'CAPTURE',
      timestamp,
      nonce,
      planetCoords: {...planetCoords},
    };
    await this.accountDB.save(this.state.data);
    this._notify('recordCapture');
  }

  async hashFleet(
    from: {x: number; y: number},
    to: {x: number; y: number},
    gift: boolean,
    specific: string,
    arrivalTimeWanted: number,
    nonce: number,
    fleetOwner: string,
    fleetSender?: string,
    operator?: string
  ): Promise<{toHash: string; fleetId: string; secretHash: string}> {
    // TODO use timestamp to allow user to retrieve a lost secret by knowing `to` and approximate time of launch
    // const randomNonce =
    //   '0x' +
    //   Array.from(crypto.getRandomValues(new Uint8Array(32)))
    //     .map((b) => b.toString(16).padStart(2, '0'))
    //     .join('');
    const toString = xyToLocation(to.x, to.y);
    const fromString = xyToLocation(from.x, from.y);
    // console.log({randomNonce, toString, fromString});
    const secretHash = keccak256(['bytes32', 'uint256', 'uint256'], [privateWallet.hashString(), fromString, nonce]);
    // console.log({secretHash});
    const toHash = keccak256(
      ['bytes32', 'uint256', 'bool', 'address', 'uint256'],
      [secretHash, toString, gift, specific, arrivalTimeWanted]
    );
    const fleetId = keccak256(
      ['bytes32', 'uint256', 'address', 'address'],
      [toHash, fromString, fleetSender || fleetOwner, operator || fleetOwner]
    );
    return {toHash, fleetId, secretHash};
  }

  async recordFleet(
    fleet: {
      owner: string;
      id: string;
      from: PlanetCoords;
      to: PlanetCoords;
      gift: boolean;
      specific: string;
      potentialAlliances?: string[];
      fleetAmount: number;
      arrivalTimeWanted: number;
      fleetSender?: string;
      operator?: string;
    },
    walletAddress: string,
    txHash: string,
    timestamp: number,
    nonce: number,
    overrideTimestamp?: number
  ): Promise<void> {
    this.check();
    this.state.data.pendingActions[txHash] = {
      fleetId: fleet.id,
      timestamp,
      nonce,
      type: 'SEND',
      from: {...fleet.from},
      to: {...fleet.to},
      gift: fleet.gift,
      specific: fleet.specific,
      potentialAlliances: fleet.potentialAlliances ? [...fleet.potentialAlliances] : undefined,
      quantity: fleet.fleetAmount,
      arrivalTimeWanted: fleet.arrivalTimeWanted,
      fleetSender: fleet.fleetSender,
      operator: fleet.operator,
      fleetOwner: fleet.owner,
      overrideTimestamp,
      walletAddress,
    };
    await this.accountDB.save(this.state.data);
    this._notify('recordFleet');
  }

  async recordFleetLaunchTime(txHash: string, launchTime: number): Promise<void> {
    this.check();
    const pendingAction = this.state.data.pendingActions[txHash] as PendingSend;
    if (pendingAction && typeof pendingAction !== 'number') {
      if (pendingAction.actualLaunchTime !== launchTime) {
        pendingAction.actualLaunchTime = launchTime;
        await this.accountDB.save(this.state.data);
        // this._notify();
      }
    }
  }

  async recordFleetResolvingTxhash(
    fleetId,
    sendTxHash: string,
    txHash: string,
    to: {x: number; y: number},
    timestamp: number,
    nonce: number,
    agent: boolean
  ): Promise<void> {
    this.check();
    (this.state.data.pendingActions[sendTxHash] as PendingSend).resolution = [txHash]; // TODO multiple in array
    this.state.data.pendingActions[txHash] = {
      type: 'RESOLUTION',
      timestamp,
      nonce,
      to,
      fleetId,
    };
    await this.accountDB.save(this.state.data);
    // TODO agent ?
    this._notify('recordFleetResolvingTxhash');
  }

  async recordExternalResolution(
    sendTxHash: string,
    to: {x: number; y: number},
    fleetId: string,
    final?: number
  ): Promise<void> {
    this.check();
    const sendAction = this.state.data.pendingActions[sendTxHash] as PendingSend | number;
    if (typeof sendAction === 'number') {
      return;
    }
    let changes = false;
    if (sendAction.resolution) {
      if (sendAction.resolution.indexOf(fleetId) === -1) {
        sendAction.resolution.push(fleetId);
        changes = true;
      }
    } else {
      sendAction.resolution = [fleetId];
      changes = true;
    }
    const existing = this.state.data.pendingActions[fleetId];
    if (typeof existing !== 'number') {
      if (!existing) {
        const resolutionAction: PendingResolution = {
          type: 'RESOLUTION',
          external: {status: 'SUCCESS', final},
          timestamp: final,
          to,
          nonce: 0,
          fleetId,
        };
        this.state.data.pendingActions[fleetId] = resolutionAction;
        changes = true;
      } else {
        if (!existing.external?.final || existing.external?.final < final) {
          existing.external = {status: 'SUCCESS', final};
          changes = true;
        }
      }
    }
    if (changes) {
      await this.accountDB.save(this.state.data);
      this._notify('recordExternalResolution');
    }
  }

  async recordExit(
    planetCoords: {x: number; y: number},
    txHash: string,
    timestamp: number,
    nonce: number
  ): Promise<void> {
    this.check();
    this.state.data.pendingActions[txHash] = {
      type: 'EXIT',
      timestamp,
      nonce,
      planetCoords,
    };
    await this.accountDB.save(this.state.data);
    // TODO agent ?
    this._notify('recordExit');
  }

  async deletePendingAction(txHash: string): Promise<void> {
    this.check();
    if (this.deletedPendingActions.indexOf(txHash) === -1) {
      this.deletedPendingActions.push(txHash);
    }
    delete this.state.data.pendingActions[txHash];
    await this.accountDB.save(this.state.data);
    this._notify('deletePendingAction');
  }

  async cancelActionAcknowledgment(txHash: string): Promise<void> {
    this.check();
    const action = this.state.data.pendingActions[txHash];
    if (action && typeof action !== 'number') {
      action.acknowledged = undefined;
      action.acknowledgementTime = now();
      await this.accountDB.save(this.state.data);
      this._notify('cancelActionAcknowledgment');
    }
  }

  getAcknowledgement(id: string): Acknowledgement | undefined {
    return this.state.data?.acknowledgements && this.state.data?.acknowledgements[id];
  }

  getPendingAction(id: string): PendingAction | number {
    return this.state.data?.pendingActions && this.state.data?.pendingActions[id];
  }

  getSendActionFromFleetId(fleetId): PendingSend | undefined {
    if (!this.state.data?.pendingActions) {
      return undefined;
    }
    for (const key of Object.keys(this.state.data?.pendingActions)) {
      const pendingAction = this.state.data?.pendingActions[key];
      if (
        pendingAction &&
        typeof pendingAction !== 'number' &&
        pendingAction.type === 'SEND' &&
        pendingAction.fleetId === fleetId
      ) {
        return pendingAction;
      }
    }
  }

  async acknowledgeEvent(event: MyEvent): Promise<void> {
    this.check();
    const eventId = event.id;
    let eventStateHash;
    if (event.type === 'external_fleet_arrived' || event.type === 'internal_fleet_arrived') {
      // TODO other event type
      eventStateHash = event.event.planetLoss + ':' + event.event.fleetLoss + ':' + event.event.won; // TODO ensure we use same stateHash across code paths
    } else if (event.type === 'external_fleet_sent') {
      eventStateHash = '' + event.event.quantity;
    } else if (event.type === 'exit_complete') {
      eventStateHash = `${event.interupted}`; // TODO ensure we use same stateHash across code paths
    }
    const acknowledgement = this.state.data?.acknowledgements[eventId];
    if (!acknowledgement) {
      this.state.data.acknowledgements[eventId] = {
        timestamp: now(),
        stateHash: eventStateHash,
      };
      await this.accountDB.save(this.state.data);
      this._notify('acknowledgeEvent new');
    } else if (acknowledgement.stateHash !== eventStateHash) {
      acknowledgement.timestamp = now();
      acknowledgement.stateHash = eventStateHash;
      await this.accountDB.save(this.state.data);
      this._notify('acknowledgeEvent changed');
    }
  }

  async acknowledgeSuccess(txHash: string, fleetId: string | null, final?: number): Promise<void> {
    return this.acknowledgeAction('SUCCESS', txHash, fleetId, final);
  }

  async acknowledgeError(txHash: string, fleetId: string | null, final?: number): Promise<void> {
    return this.acknowledgeAction('ERROR', txHash, fleetId, final);
  }

  async acknowledgeAction(
    statusType: 'SUCCESS' | 'ERROR',
    txHash: string,
    fleetId: string | null,
    final?: number
  ): Promise<void> {
    this.check();
    const pendingAction = this.state.data.pendingActions[txHash];
    if (pendingAction && typeof pendingAction !== 'number') {
      if (final) {
        this.state.data.pendingActions[txHash] = final;
      } else {
        pendingAction.acknowledged = statusType;
        pendingAction.acknowledgementTime = now();
      }
      await this.accountDB.save(this.state.data);
      this._notify('acknowledgeAction');
    }
  }

  async recordTxActionAsFinal(
    txHash: string,
    statusType: 'SUCCESS' | 'FAILURE' | 'CANCELED' | 'TIMEOUT',
    final: number
  ): Promise<void> {
    this.check();
    const pendingAction = this.state.data.pendingActions[txHash];
    if (pendingAction && typeof pendingAction !== 'number' && !pendingAction.final) {
      pendingAction.final = {timestamp: final, status: statusType};
      await this.accountDB.save(this.state.data);
      this._notify('recordTxActionAsFinal');
    }
  }

  async markAsFullyAcknwledged(txHash: string, timestamp: number): Promise<void> {
    this.check();
    const action = this.state.data.pendingActions[txHash];
    if (action && typeof action !== 'number') {
      this.state.data.pendingActions[txHash] = timestamp;
      await this.accountDB.save(this.state.data);
      this._notify('markAsFullyAcknwledged');
    }
  }

  async recordQueueID(txHash: string, queueID: string) {
    this.check();
    const pendingAction = this.state.data.pendingActions[txHash] as PendingSend;
    if (pendingAction && typeof pendingAction !== 'number') {
      if (pendingAction.queueID !== queueID) {
        pendingAction.queueID = queueID;
        await this.accountDB.save(this.state.data);
        this._notify('recordQueueID');
      }
    }
  }

  private check() {
    if (!this.state.data) {
      throw new Error(`Account not ready yet`);
    }
  }

  public isReady() {
    return !!this.state.data;
  }

  private _start(): () => void {
    this.stopPrivateWalletSubscription = privateWallet.subscribe(async ($privateWallet) => {
      await this._handlePrivateWalletChange($privateWallet);
    });
    return this._stop.bind(this);
  }

  private async _handlePrivateWalletChange($privateWallet: PrivateWalletState): Promise<void> {
    // console.log({$privateWallet});
    if ($privateWallet.step !== 'READY') {
      if (this.unsubscribeFromSync) {
        this.unsubscribeFromSync();
        this.unsubscribeFromSync = undefined;
      }
      this.state.step = 'IDLE';
      this.state.data = undefined;
      this.state.ownerAddress = $privateWallet.ownerAddress;
      this._notify('_handlePrivateWalletChange not READY');
      return;
    }
    if (
      !this.accountDB ||
      $privateWallet.ownerAddress !== this.accountDB.ownerAddress ||
      $privateWallet.chainId !== this.accountDB.chainId
    ) {
      if (this.unsubscribeFromSync) {
        this.unsubscribeFromSync();
        this.unsubscribeFromSync = undefined;
      }

      this.state.step = 'IDLE';
      this.state.data = undefined;
      // if (this.state.data) {this.state.data.pendingActions = {};}
      // if (this.state.data) {this.state.data.welcomingStep = undefined;}
      this.state.ownerAddress = $privateWallet.ownerAddress;
      this._notify('_handlePrivateWalletChange READY');

      if ($privateWallet.ownerAddress) {
        this.accountDB = new AccountDB(
          $privateWallet.ownerAddress,
          $privateWallet.chainId,
          SYNC_URI,
          SYNC_DB_NAME,
          $privateWallet.signer,
          $privateWallet.aesKey,
          this._merge.bind(this),
          $privateWallet.syncEnabled
        );
        this.unsubscribeFromSync = this.accountDB.subscribe(this.onSync.bind(this));
        console.log(`SYNC: requesting sync after account changed`);
        this.accountDB.requestSync();
      }
    }
  }

  private onSync(syncingState: SyncingState<AccountData>): void {
    this.state.syncError = syncingState.error;
    this.state.data = syncingState.data;
    this.state.remoteDisabledOrSynced = syncingState.remoteFetchedAtLeastOnce || !syncingState.remoteSyncEnabled;
    if (this.state.data) {
      this.state.step = 'READY';
    } else {
      this.state.step = 'IDLE';
    }
    this._notify('onSync');
  }

  private _merge(
    localData?: AccountData,
    remoteData?: AccountData
  ): {newData: AccountData; newDataOnLocal: boolean; newDataOnRemote: boolean} {
    let newDataOnLocal = false;
    let newDataOnRemote = false;
    let newData = localData;
    if (!newData) {
      newData = {
        pendingActions: {},
        welcomingStep: 0,
        acknowledgements: {},
      };
    }

    if (!remoteData) {
      remoteData = {
        pendingActions: {},
        welcomingStep: 0,
        acknowledgements: {},
      };
    }

    for (const txHash of this.deletedPendingActions) {
      if (remoteData.pendingActions[txHash]) {
        delete remoteData.pendingActions[txHash];
        newDataOnLocal = true;
      }
      if (newData.pendingActions[txHash]) {
        delete newData.pendingActions[txHash];
        newDataOnLocal = true;
      }
    }

    if (remoteData.welcomingStep > newData.welcomingStep) {
      newDataOnRemote = true;
      newData.welcomingStep = newData.welcomingStep | remoteData.welcomingStep;
    } else if (!remoteData.welcomingStep || newData.welcomingStep > remoteData.welcomingStep) {
      newDataOnLocal = true;
    }

    if (remoteData.agentServiceDefault && !newData.agentServiceDefault) {
      newDataOnRemote = true;
      newData.agentServiceDefault = remoteData.agentServiceDefault;
    } else if (!remoteData.agentServiceDefault && newData.agentServiceDefault) {
      newDataOnLocal = true;
    } else if (remoteData.agentServiceDefault && newData.agentServiceDefault) {
      if (remoteData.agentServiceDefault.timestamp > newData.agentServiceDefault.timestamp) {
        newDataOnRemote = true;
        newData.agentServiceDefault = remoteData.agentServiceDefault;
      } else if (remoteData.agentServiceDefault.timestamp < newData.agentServiceDefault.timestamp) {
        newDataOnLocal = true;
      }
    }

    if (remoteData.pendingActions) {
      for (const txHash of Object.keys(remoteData.pendingActions)) {
        const remotePendingAction = remoteData.pendingActions[txHash];
        const pendingAction = newData.pendingActions[txHash];

        if (!pendingAction) {
          newData.pendingActions[txHash] = remotePendingAction;
          newDataOnRemote = true;
        } else {
          if (typeof pendingAction === 'number' && typeof remotePendingAction !== 'number') {
            if (remotePendingAction.overrideTimestamp && remotePendingAction.overrideTimestamp > pendingAction) {
              newDataOnRemote = true;
              newData.pendingActions[txHash] = remotePendingAction;
            } else {
              newDataOnLocal = true;
            }
          } else if (typeof pendingAction !== 'number' && typeof remotePendingAction === 'number') {
            if (pendingAction.overrideTimestamp && pendingAction.overrideTimestamp > remotePendingAction) {
              newDataOnLocal = true;
            } else {
              newDataOnRemote = true;
              newData.pendingActions[txHash] = remotePendingAction;
            }
          } else if (typeof pendingAction !== 'number' && typeof remotePendingAction !== 'number') {
            if (pendingAction.acknowledged !== remotePendingAction.acknowledged) {
              if (
                !remotePendingAction.acknowledgementTime ||
                (pendingAction.acknowledgementTime &&
                  pendingAction.acknowledgementTime >= remotePendingAction.acknowledgementTime)
              ) {
                newDataOnLocal = true;
              } else {
                newDataOnRemote = true;
                pendingAction.acknowledged = remotePendingAction.acknowledged;
                pendingAction.acknowledgementTime = remotePendingAction.acknowledgementTime;
              }
            }
            if (pendingAction.final && !remotePendingAction.final) {
              newDataOnLocal = true;
            } else if (!pendingAction.final && remotePendingAction.final) {
              newDataOnRemote = true;
              pendingAction.final = remotePendingAction.final;
            } else {
              // TODO ?
            }
            if (pendingAction.external && !remotePendingAction.external) {
              newDataOnLocal = true;
            } else if (!pendingAction.external && remotePendingAction.external) {
              newDataOnRemote = true;
              pendingAction.external = remotePendingAction.external;
            }
            if (pendingAction.type === 'SEND' && remotePendingAction.type === 'SEND') {
              const {newOnLocal, newOnRemote, newArray} = mergeStringArrays(
                pendingAction.resolution,
                remotePendingAction.resolution
              );
              if (newOnLocal) {
                newDataOnLocal = true;
              }
              if (newOnRemote) {
                pendingAction.resolution = newArray;
                newDataOnRemote = true;
              }

              if (pendingAction.actualLaunchTime && !remotePendingAction.actualLaunchTime) {
                newDataOnLocal = true;
              } else if (!pendingAction.actualLaunchTime && remotePendingAction.actualLaunchTime) {
                newDataOnRemote = true;
                pendingAction.actualLaunchTime = remotePendingAction.actualLaunchTime;
              }

              if (pendingAction.queueID && !remotePendingAction.queueID) {
                newDataOnLocal = true;
              } else if (!pendingAction.queueID && remotePendingAction.queueID) {
                newDataOnRemote = true;
                pendingAction.queueID = remotePendingAction.queueID;
              }
            }
          }
          // TODO more merge pendingAction
          // newDataOnLocal = true;
          // newDataOnRemote = true;
        }
      }
      for (const txHash of Object.keys(newData.pendingActions)) {
        if (!remoteData.pendingActions[txHash]) {
          newDataOnLocal = true;
        }
      }
    } else {
      newDataOnLocal = true;
    }

    const txHashesToDelete: string[] = [];
    const currentTime = isCorrected() ? now() : undefined;
    if (currentTime) {
      for (const txHash of Object.keys(newData.pendingActions)) {
        const actionTimestamp = newData.pendingActions[txHash];
        if (typeof actionTimestamp === 'number') {
          if (currentTime - actionTimestamp > deletionDelay) {
            txHashesToDelete.push(txHash);
            newDataOnLocal = true;
            if (!remoteData.pendingActions[txHash]) {
              // already deleted on remote
              newDataOnRemote = true;
            }
          }
        }
      }

      if (txHashesToDelete.length > 0) {
        console.log(`deleting ${txHashesToDelete.length} expired actions`);
        for (const txHash of txHashesToDelete) {
          delete newData.pendingActions[txHash];
        }
      }
    }

    if (remoteData.acknowledgements) {
      for (const id of Object.keys(remoteData.acknowledgements)) {
        const remoteAcknowledgement = remoteData.acknowledgements[id];
        const acknowledgement = newData.acknowledgements[id];

        if (!acknowledgement) {
          newData.acknowledgements[id] = remoteAcknowledgement;
          newDataOnRemote = true;
        } else {
          if (typeof acknowledgement === 'number' && typeof remoteAcknowledgement !== 'number') {
            newDataOnLocal = true;
          } else if (typeof acknowledgement !== 'number' && typeof remoteAcknowledgement === 'number') {
            newDataOnRemote = true;
            newData.pendingActions[id] = remoteAcknowledgement;
          } else if (typeof acknowledgement !== 'number' && typeof remoteAcknowledgement !== 'number') {
            if (acknowledgement.timestamp !== remoteAcknowledgement.timestamp) {
              if (acknowledgement.timestamp > remoteAcknowledgement.timestamp) {
                newDataOnLocal = true;
              } else {
                newDataOnRemote = true;
                acknowledgement.timestamp = remoteAcknowledgement.timestamp;
                acknowledgement.stateHash = remoteAcknowledgement.stateHash;
              }
            }
          }
          // TODO more merge pendingAction
          // newDataOnLocal = true;
          // newDataOnRemote = true;
        }
      }
      for (const id of Object.keys(newData.acknowledgements)) {
        if (!remoteData.acknowledgements[id]) {
          newDataOnLocal = true;
        }
      }
    } else {
      newDataOnLocal = true;
    }

    return {
      newData,
      newDataOnLocal,
      newDataOnRemote,
    };
  }

  private _stop(): void {
    if (this.stopPrivateWalletSubscription) {
      this.stopPrivateWalletSubscription();
      this.stopPrivateWalletSubscription = undefined;
    }
  }

  private _notify(message: string): void {
    console.log(`notify: ${message}`);
    this.store.set(this.state);
  }

  generateError() {
    throw new Error(`error on version: ${__VERSION__}`);
  }
}

export const account = new Account();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).account = account;
}

setGetName(() => wallet.address || undefined);
