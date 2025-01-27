import {account} from '$lib/account/account';
import type {SpaceQueryWithPendingState, SyncedPendingAction} from '$lib/space/optimisticSpace';
import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';
import {now, time} from '$lib/time';
import type {SpaceInfo, PlanetInfo} from 'conquest-eth-common';
import type {Readable, Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import {spaceInfo} from './spaceInfo';

export type FleetState =
  | 'LOADING'
  | 'SEND_BROADCASTED'
  | 'TRAVELING'
  | 'READY_TO_RESOLVE'
  | 'TOO_LATE_TO_RESOLVE'
  | 'RESOLVE_BROADCASTED'
  | 'WAITING_ACKNOWLEDGMENT';

// object representing a fleet (publicly)
export type Fleet = {
  txHash: string; // TODO better id
  from: PlanetInfo;
  to: PlanetInfo;
  quantity: number; // not needed to store, except to not require contract fetch
  duration: number;
  launchTime: number;
  amountDestroyed: number;
  timeLeft: number; // not needed to store, except to not require computing stats from from planet
  timeToResolve: number;
  gift: boolean;
  specific: string;
  arrivalTimeWanted: number;
  potentialAlliances?: string[];
  owner: string;
  walletAddress: string;
  fleetSender?: string;
  operator?: string;
  sending: {
    id: string;
    status: 'SUCCESS' | 'FAILURE' | 'LOADING' | 'PENDING' | 'CANCELED' | 'TIMEOUT';
    action: {nonce: number; timestamp: number; queueID?: string};
  }; // TODO use pendingaction type
  resolution?: {
    id: string;
    status: 'SUCCESS' | 'FAILURE' | 'LOADING' | 'PENDING' | 'CANCELED' | 'TIMEOUT';
    action: {nonce: number; timestamp: number};
  }; // TODO use pendingaction type
  state: FleetState;
};

export type FleetListState = {fleets: Fleet[]; step: 'LOADING' | 'IDLE' | 'LOADED'};

export class FleetsStore implements Readable<FleetListState> {
  private readonly spaceInfo: SpaceInfo;
  private store: Writable<FleetListState>;
  public state: FleetListState = {
    fleets: [],
    step: 'IDLE',
  };

  constructor(spaceInfo: SpaceInfo) {
    this.spaceInfo = spaceInfo;
    this.store = writable(this.state, this._start.bind(this));
  }

  _start(): void {
    time.subscribe(this.onTime.bind(this));
    spaceQueryWithPendingActions.subscribe(this.onSpaceUpdate.bind(this));
  }

  private onTime() {
    for (const fleet of this.state.fleets) {
      // const normalDuration = fleet.duration;
      const minDuration = spaceInfo.timeToArrive(fleet.from, fleet.to); // TODO store in fleet ?
      const duration = Math.max(minDuration, fleet.arrivalTimeWanted - fleet.launchTime);
      fleet.timeLeft = Math.max(duration - (now() - fleet.launchTime), 0);
      if (fleet.timeLeft <= 0) {
        fleet.timeToResolve = Math.max(fleet.launchTime + duration + spaceInfo.resolveWindow - now(), 0);
      }
    }
    this.store.set(this.state);
  }

  private onSpaceUpdate(update: SpaceQueryWithPendingState): void {
    this.state.fleets.length = 0;
    let loading = false;

    const pendingActions = update.queryState.data ? update.pendingActions : update.rawPendingActions;

    for (const pendingAction of pendingActions) {
      if (pendingAction.action.type === 'SEND') {
        const sendAction = pendingAction.action;
        // TODO
        if (pendingAction.status === 'FAILURE') {
        } else if (pendingAction.status === 'CANCELED') {
        } else if (pendingAction.status === 'TIMEOUT') {
        } else {
          const from = spaceInfo.getPlanetInfo(sendAction.from.x, sendAction.from.y);
          const to = spaceInfo.getPlanetInfo(sendAction.to.x, sendAction.to.y);
          if (!from) {
            console.error(`not planet found at ${sendAction.from.x}, ${sendAction.from.y}`);
          }
          if (!to) {
            console.error(`not planet found at ${sendAction.to.x}, ${sendAction.to.y}`);
          }

          let launchTime = now(); // TODO  update.queryState.data?.chain?.timestamp ?
          if (sendAction.actualLaunchTime) {
            launchTime = sendAction.actualLaunchTime;
            // console.log({actualLaunchTime: launchTime});
          } else if (pendingAction.txTimestamp) {
            launchTime = pendingAction.txTimestamp;
            // console.log({savingActualLaunchTime: launchTime});
            account.recordFleetLaunchTime(pendingAction.id, launchTime);
          } else if (pendingAction.final) {
            account.recordFleetLaunchTime(pendingAction.id, pendingAction.final);
          }

          const minDuration = spaceInfo.timeToArrive(from, to);
          const duration = Math.max(minDuration, sendAction.arrivalTimeWanted - launchTime);

          const timeLeft = Math.max(duration - (now() - launchTime), 0);
          let timeToResolve = 0;

          let state: FleetState = 'SEND_BROADCASTED';
          if (pendingAction.status === 'SUCCESS') {
            state = 'TRAVELING';
            if (timeLeft <= 0) {
              state = 'READY_TO_RESOLVE';
              timeToResolve = Math.max(launchTime + duration + spaceInfo.resolveWindow - now(), 0);
              if (timeToResolve <= 0) {
                state = 'TOO_LATE_TO_RESOLVE';
              }
            }
          } else if (pendingAction.status === 'LOADING') {
            state = 'LOADING';
            // console.log(`still loading some fleets ${pendingAction.id}`);
            loading = true;
          }

          let resolved = false;
          let resolution: SyncedPendingAction | undefined;
          if (sendAction.resolution) {
            // console.log('RESOLUTION', sendAction.resolution);
            let pendingResolution;
            for (const reso of sendAction.resolution) {
              pendingResolution = update.pendingActions.find((v) => v.id === reso);
              if (pendingResolution) {
                break;
              }
            }

            // if (!pendingResolution) {
            //   let rawPendingResolutionAction;
            //   for (const reso of sendAction.resolution) {
            //     rawPendingResolutionAction = account.getPendingAction(reso);
            //     if (rawPendingResolutionAction) {
            //       break;
            //     }
            //   }
            //   if (typeof rawPendingResolutionAction === 'number') {
            //     resolved = true;
            //   }
            // }

            if (!resolved) {
              if (pendingResolution) {
                resolution = pendingResolution;

                if (!(resolution.status === 'FAILURE' && resolution.action.acknowledged)) {
                  state = 'RESOLVE_BROADCASTED';

                  if (resolution.status === 'SUCCESS' && resolution.action.acknowledged) {
                    continue; // alterady acknowledged
                  }

                  if (resolution.status === 'SUCCESS' || resolution.counted) {
                    // TODO error
                    state = 'WAITING_ACKNOWLEDGMENT';
                    try {
                      console.log('WAITING_ACKNOWLEDGMENT', {
                        tx: resolution.id,
                        status: resolution.status,
                        type: resolution.action.type,
                        nonce: resolution.action.nonce,
                        acknowledged: resolution.action.acknowledged,
                        acknowledgementTime: resolution.action.acknowledgementTime,
                        final: resolution.action.final,
                        external: resolution.action.external,
                        timestamp: resolution.action.timestamp,
                      });
                    } catch (e) {
                      console.error(e);
                    }

                    // continue; // acknowledgement go through events // TODO enable even though but should be required
                  }
                }
              } else {
                // TODO error ?
              }
              resolved = resolution ? resolution.status === 'SUCCESS' && !!resolution.action.acknowledged : false;
            }
          } else if (
            state === 'READY_TO_RESOLVE' &&
            sendAction.queueID &&
            // NOTE : delay the display of resolution when agent-service is used
            spaceInfo.resolveWindow - timeToResolve < spaceInfo.resolveWindow / 72
          ) {
            // TODO config : 10 * 60 = 10 min late before showing the button to resolve manually
            state = 'RESOLVE_BROADCASTED'; //TODO add another state for agent-service handling
          }

          // console.log({state})
          if (!resolved) {
            const gift = sendAction.gift;
            if (gift) {
              if (sendAction.specific === '0x0000000000000000000000000000000000000001') {
                // if ()
                // TODO make gift based on current destination owner
              }
              // TODO other
            } else {
              if (sendAction.specific === '0x0000000000000000000000000000000000000001') {
                // TODO make gift based on current destination owner
              } else if (sendAction.specific === '0x0000000000000000000000000000000000000000') {
                // never gift // except if destination is you
              }
              // other
            }
            this.state.fleets.push({
              txHash: pendingAction.id, // TODO better id
              from,
              to,
              duration,
              quantity: sendAction.quantity,
              launchTime,
              amountDestroyed: 0, // TODO
              timeLeft,
              timeToResolve,
              sending: pendingAction,
              resolution,
              state,
              gift,
              specific: sendAction.specific,
              arrivalTimeWanted: sendAction.arrivalTimeWanted,
              potentialAlliances: sendAction.potentialAlliances,
              owner: sendAction.fleetOwner,
              fleetSender: sendAction.fleetSender,
              operator: sendAction.operator,
              walletAddress: sendAction.walletAddress,
            });
          }
        }
      }
    }

    if (loading) {
      this.state.step = 'LOADING';
      console.log(`still loading some fleets`);
    } else {
      this.state.step = 'LOADED';
      // console.log(`no more loading of fleets`);
    }

    this.state.fleets = this.state.fleets.sort((a, b) => a.timeLeft - b.timeLeft);
    this.store.set(this.state);
  }

  subscribe(run: (value: FleetListState) => void, invalidate?: (value?: FleetListState) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }
}

export const fleetList = new FleetsStore(spaceInfo);

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).fleetList = fleetList;
}
