import type {AccountState, Acknowledgements, PendingAction, PendingActions} from '$lib/account/account';
import {account} from '$lib/account/account';
import type {SpaceQueryWithPendingState} from '$lib/space/optimisticSpace';
import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';
import {now} from '$lib/time';
import type {Readable, Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import {spaceInfo} from './spaceInfo';
// object representing a fleet (publicly)
export type SpaceError = {
  txHash: string; // TODO better id
  status: 'SUCCESS' | 'FAILURE' | 'LOADING' | 'PENDING' | 'CANCELED' | 'TIMEOUT';
  action: PendingAction;
  location: {x: number; y: number};
  acknowledged: boolean;
  late?: boolean;
};

export class ErrorsStore implements Readable<SpaceError[]> {
  private store: Writable<SpaceError[]>;
  private errors: SpaceError[] = [];
  private currentOwner: string;
  private tmpErrors: SpaceError[] = [];
  private tmpPlayer: string;
  // private acknowledgements: Acknowledgements;
  private pendingActions: PendingActions;

  constructor() {
    this.store = writable(this.errors, this._start.bind(this));
  }

  _start(): void {
    spaceQueryWithPendingActions.subscribe(this.onSpaceUpdate.bind(this));
    account.subscribe(this._handleAccountChange.bind(this));
  }

  private onSpaceUpdate(update: SpaceQueryWithPendingState): void {
    const newErrors = [];
    for (const pendingAction of update.pendingActions) {
      let errorProcessed = false;
      let location: {x: number; y: number} | undefined;
      if (pendingAction.action.type === 'SEND') {
        location = pendingAction.action.from;

        let pendingResolution;
        const sendAction = pendingAction.action;
        if (sendAction.resolution) {
          for (const reso of sendAction.resolution) {
            pendingResolution = update.pendingActions.find((v) => v.id === reso);
            if (pendingResolution) {
              break;
            }
          }
        }
        if (!pendingResolution) {
          // copied from fleets, TODO DRY
          const from = spaceInfo.getPlanetInfo(sendAction.from.x, sendAction.from.y);
          const to = spaceInfo.getPlanetInfo(sendAction.to.x, sendAction.to.y);
          const minDuration = spaceInfo.timeToArrive(from, to);

          if (sendAction.actualLaunchTime) {
            const duration = Math.max(minDuration, sendAction.arrivalTimeWanted - sendAction.actualLaunchTime);
            const launchTime = sendAction.actualLaunchTime;
            const timeLeft = Math.max(duration - (now() - launchTime), 0);
            let timeToResolve = 0;
            if (pendingAction.status === 'SUCCESS') {
              if (timeLeft <= 0) {
                timeToResolve = Math.max(launchTime + duration + spaceInfo.resolveWindow - now(), 0);
                if (timeToResolve <= 0) {
                  errorProcessed = true;
                  location = pendingAction.action.to;
                  newErrors.push({
                    action: pendingAction.action,
                    status: 'TIMEOUT',
                    txHash: pendingAction.id,
                    location,
                    acknowledged: pendingAction.action.acknowledged === 'ERROR',
                    late: true, // special case
                  });
                }
              }
            }
          }
        }
      } else if (pendingAction.action.type === 'CAPTURE') {
        // TODO  handle multiple coords
        location = pendingAction.action.planetCoords[0];
      } else if (pendingAction.action.type === 'RESOLUTION') {
        location = pendingAction.action.to;
      } else if (pendingAction.action.type === 'EXIT') {
        location = pendingAction.action.planetCoords;
      }

      if (
        !errorProcessed &&
        (pendingAction.status === 'FAILURE' ||
          pendingAction.status === 'CANCELED' ||
          pendingAction.status === 'TIMEOUT')
      ) {
        newErrors.push({
          action: pendingAction.action,
          status: pendingAction.status,
          txHash: pendingAction.id,
          location,
          acknowledged: pendingAction.action.acknowledged === 'ERROR',
        });
      }
    }

    const newPlayerID = update.queryState.data?.player?.id;
    if (this.currentOwner !== newPlayerID) {
      this.tmpPlayer = newPlayerID;
      this.tmpErrors = newErrors;
      this.errors.length = 0;
      // TODO loading ?
    } else {
      this.errors = this.addAcknowledgements(newErrors);
    }

    this.store.set(this.errors);
  }

  private addAcknowledgements(newErrors: SpaceError[]): SpaceError[] {
    for (const error of newErrors) {
      const pendingAction = (this.pendingActions && this.pendingActions[error.txHash]) || error.action;
      error.acknowledged = typeof pendingAction === 'number' || pendingAction?.acknowledged === 'ERROR';
    }
    return newErrors.filter((v) => !v.acknowledged); // TODO should we include all and filter in UI instead ?
  }

  private async _handleAccountChange($account: AccountState): Promise<void> {
    const newPlayer = $account.ownerAddress?.toLowerCase();
    // this.acknowledgements = $account.data?.acknowledgements; // not used by errors
    this.pendingActions = $account.data?.pendingActions;

    if ($account.step === 'IDLE') {
      this.currentOwner = undefined;
      this.errors = [];
    } else if (this.currentOwner === newPlayer) {
      this.errors = this.addAcknowledgements(this.errors);
    } else if (newPlayer === this.tmpPlayer) {
      this.currentOwner = newPlayer;
      this.errors = this.addAcknowledgements(this.tmpErrors);
    } else {
      this.currentOwner = newPlayer;
      this.errors = [];
      // TODO loading
    }

    this.store.set(this.errors);
  }

  subscribe(run: (value: SpaceError[]) => void, invalidate?: (value?: SpaceError[]) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }
}

export const errors = new ErrorsStore();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).errors = errors;
}
