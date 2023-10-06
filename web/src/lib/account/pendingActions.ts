import {writable} from 'svelte/store';
import type {Readable, Writable} from 'svelte/store';
import type {AccountState, PendingAction, PendingResolution, PendingSend} from './account';
import {account} from './account';
import type {ChainTempoInfo} from '$lib/blockchain/chainTempo';
import {chainTempo} from '$lib/blockchain/chainTempo';
import {fallback, wallet} from '$lib/blockchain/wallet';
import {now} from '$lib/time';
import {deletionDelay, finality} from '$lib/config';
import {spaceInfo} from '$lib/space/spaceInfo';

export type CheckedStatus = 'SUCCESS' | 'FAILURE' | 'LOADING' | 'PENDING' | 'CANCELED' | 'TIMEOUT';

// type CheckedStatus = {
//   failedAtBlock?: number;
// };

// export type CheckedPendingSend = PendingSend & CheckedStatus;
// export type CheckedPendingExit = PendingExit & CheckedStatus;
// export type CheckedPendingCapture = PendingCapture & CheckedStatus;
// export type CheckedPendingWithdrawal = PendingWithdrawal & CheckedStatus;

// type CheckedAction<T> = {
//   failedAtBlock?: number;
//   action: T;
// };

// export type CheckedPendingSend = CheckedAction<PendingSend>;
// export type CheckedPendingExit = CheckedAction<PendingExit>;
// export type CheckedPendingCapture = CheckedAction<PendingCapture>;
// export type CheckedPendingWithdrawal = CheckedAction<PendingWithdrawal>;

// export type CheckedPendingAction =
//   | CheckedPendingSend
//   | CheckedPendingExit
//   | CheckedPendingCapture
//   | CheckedPendingWithdrawal

export type CheckedPendingAction<T extends PendingAction = PendingAction> = {
  id: string;
  final?: number;
  txTimestamp?: number;
  status: CheckedStatus;
  action: T;
};

export type CheckedPendingActions = CheckedPendingAction[];

class PendingActionsStore implements Readable<CheckedPendingActions> {
  private state: CheckedPendingActions;
  private store: Writable<CheckedPendingActions>;
  private checkingInProgress = false;
  private ownerAddress: string | undefined;
  private processingAccountChanges: boolean;

  private stopAccountSubscription: (() => void) | undefined = undefined;
  private stopChainTempoSubscription: (() => void) | undefined = undefined;

  constructor() {
    this.state = [];
    this.store = writable(this.state, this._start.bind(this));
  }

  subscribe(
    run: (value: CheckedPendingActions) => void,
    invalidate?: (value?: CheckedPendingActions) => void
  ): () => void {
    return this.store.subscribe(run, invalidate);
  }

  private _start(): () => void {
    this.stopAccountSubscription = account.subscribe(async ($account) => {
      await this._handleAccountChange($account);
    });
    this.stopChainTempoSubscription = chainTempo.subscribe(async ($chainTempoInfo) => {
      await this._handleChainTempo($chainTempoInfo);
    });
    return this._stop.bind(this);
  }

  private async _handleAccountChange($account: AccountState): Promise<void> {
    if (this.processingAccountChanges && $account.ownerAddress === this.ownerAddress) {
      console.log(`already processing..., should we postpone, or cancel ?`);
      return;
    }
    this.processingAccountChanges = true;
    try {
      // console.log(`PENDING ACTION, update from account`);
      if ($account.data) {
        const txHashes = Object.keys($account.data.pendingActions);
        for (const txHash of txHashes) {
          const action = $account.data.pendingActions[txHash];
          if (typeof action === 'number') {
            continue;
          }
          // if (action.acknowledged) {
          //   continue;
          // }
          const found = this.state.find((v) => v.id === txHash);
          if (!found) {
            console.log(`new pending tx ${txHash}`);
            this.state.push({
              id: txHash,
              status: action.external ? action.external.status : action.final ? action.final.status : 'LOADING',
              final: action.external ? action.external.final : action.final ? action.final.timestamp : undefined,
              action,
            });
          }
        }
        for (let i = this.state.length - 1; i >= 0; i--) {
          if (
            !$account.data.pendingActions[this.state[i].id] ||
            typeof $account.data.pendingActions[this.state[i].id] === 'number'
          ) {
            this.state.splice(i, 1);
          }
        }
      } else {
        this.state.length = 0;
      }

      this.ownerAddress = $account.ownerAddress;

      this._handleChainTempo(chainTempo.chainInfo);
      // TODO this should collect changes... and then call save
      //  currently it trigger save which then amke it go in a endless loop

      this._notify();
    } catch (e) {}
    this.processingAccountChanges = false;
  }

  private async _handleChainTempo($chainTempoInfo: ChainTempoInfo): Promise<void> {
    // console.log(`PENDING ACTIONS (${this.state.length} items) chain tempo : ${chainTempo.chainInfo.lastBlockNumber}`);
    if (!$chainTempoInfo.lastBlockNumber) {
      console.log(`no block number, skip...`);
      return; // TODO ?
    }
    if (this.checkingInProgress) {
      console.log(`check in progress, skip...`);
      return;
    }
    const ownerAddress = this.ownerAddress;
    this.checkingInProgress = true;
    for (const item of this.state) {
      if (item.action.external) {
        item.final = item.action.external.final;
        item.status = item.action.external.status;
        if (item.final) {
          try {
            this._handleFinalAcknowledgement(item, item.final, 'SUCCESS');
          } catch (e) {
            console.error(e);
          }
        } else {
          if (item.action.type === 'RESOLUTION' && item.action.fleetId) {
            if (account.getAcknowledgement(item.action.fleetId)) {
              // TODO should wait final or call _checkResolutionViaSend and check finality
              await account.markAsFullyAcknwledged(item.id, now());
            }
          }
        }
        continue;
      }
      try {
        // console.log(`checking ${item.id}...`);
        await this._checkAction(ownerAddress, item, $chainTempoInfo.lastBlockNumber);

        if (this.ownerAddress !== ownerAddress) {
          console.log(`cancel checks as account changed`);
          this.checkingInProgress = false;
          return;
        }
        if (item.action.type === 'SEND') {
          await this._checkResolutionViaSend(
            ownerAddress,
            item as CheckedPendingAction<PendingSend>,
            $chainTempoInfo.lastBlockNumber
          );
        }
      } catch (e) {
        console.error(e);
      }
      if (this.ownerAddress !== ownerAddress) {
        console.log(`cancel checks as account changed`);
        this.checkingInProgress = false;
        return;
      }
    }
    this.checkingInProgress = false;
  }

  private async _handleFinalAcknowledgement(
    checkedAction: CheckedPendingAction,
    timestamp: number,
    finalStatus: 'SUCCESS' | 'FAILURE' | 'CANCELED' | 'TIMEOUT'
  ): Promise<boolean> {
    const acknowledgementStatus = finalStatus === 'SUCCESS' ? 'SUCCESS' : 'ERROR';
    await account.recordTxActionAsFinal(checkedAction.id, finalStatus, timestamp);
    if (now() - timestamp > deletionDelay) {
      console.log(`delay over, deleting ${checkedAction.id} directly`);
      await account.deletePendingAction(checkedAction.id);
      return true;
    } else {
      if (checkedAction.action.acknowledged) {
        if (checkedAction.action.acknowledged !== acknowledgementStatus) {
          console.log(`cancel acknowledgement as not matching new status ${checkedAction.id}`);
          console.log({
            type: checkedAction.action.type,
            acknowledged: checkedAction.action.acknowledged,
            acknowledgementStatus,
          });
          console.log(checkedAction);
          await account.cancelActionAcknowledgment(checkedAction.id);
          return true;
        } else if (typeof checkedAction.action !== 'number') {
          console.log(`acknowledgedment final for ${checkedAction.id}`);
          await account.markAsFullyAcknwledged(checkedAction.id, timestamp);
          return true;
        }
      } else {
        if (finalStatus === 'SUCCESS') {
          if (checkedAction.action.type === 'SEND') {
            if (account.getAcknowledgement(checkedAction.action.fleetId)) {
              await account.markAsFullyAcknwledged(checkedAction.id, now());
              return true;
            }
          } else if (checkedAction.action.type === 'RESOLUTION') {
            if (account.getAcknowledgement(checkedAction.action.fleetId)) {
              await account.markAsFullyAcknwledged(checkedAction.id, now());
              return true;
            }
          } else {
            // auto resolve all success
            await account.markAsFullyAcknwledged(checkedAction.id, now());
            return true;
          }
        } else {
          // console.log(`not acknowledged yet`);
        }
      }
    }
    return false;
  }

  private async _checkResolutionViaSend(
    ownerAddress: string,
    checkedAction: CheckedPendingAction<PendingSend>,
    blockNumber: number
  ): Promise<void> {
    if (!wallet.provider) {
      return;
    }

    if (typeof checkedAction.action === 'number') {
      return;
    }

    if (checkedAction.status === 'SUCCESS' && checkedAction.final && checkedAction.action.acknowledged !== 'SUCCESS') {
      if (checkedAction.action.actualLaunchTime) {
        // TODO store minDuration in the pendingAction (PendingSend) so as not to need to compute it here?
        const fromPlanetInfo = spaceInfo.getPlanetInfo(checkedAction.action.from.x, checkedAction.action.from.y);
        const toPlanetInfo = spaceInfo.getPlanetInfo(checkedAction.action.to.x, checkedAction.action.to.y);
        const minDuration = spaceInfo.timeLeft(0, fromPlanetInfo, toPlanetInfo, 0).fullTime;
        const duration = Math.max(
          minDuration,
          checkedAction.action.arrivalTimeWanted - checkedAction.action.actualLaunchTime
        );

        if (now() > checkedAction.action.actualLaunchTime + duration) {
          const contracts = wallet.contracts || fallback.contracts;
          if (!contracts) {
            console.log(`no contracts setup, skip for now`);
            return;
          }
          const fleet = await contracts.OuterSpace.getFleet(checkedAction.action.fleetId, '0');
          if (fleet.owner != '0x0000000000000000000000000000000000000000' && fleet.quantity == 0) {
            let final = false;
            const finalisedBlockNumber = Math.max(0, blockNumber - finality);
            const finalisedBlock = await wallet.provider.getBlock(finalisedBlockNumber);
            const finalizedFleet = await wallet.contracts.OuterSpace.getFleet(checkedAction.action.fleetId, '0', {
              blockTag: finalisedBlockNumber,
            });
            if (finalizedFleet.owner != '0x0000000000000000000000000000000000000000' && finalizedFleet.quantity == 0) {
              final = true;
            }
            if (this.ownerAddress !== ownerAddress) {
              return;
            }
            await account.recordExternalResolution(
              checkedAction.id,
              checkedAction.action.to,
              checkedAction.action.fleetId,
              final ? finalisedBlock.timestamp : undefined
            );
          }
        }
      }
    }
  }
  private async _checkAction(ownerAddress: string, checkedAction: CheckedPendingAction, blockNumber: number) {
    if (!wallet.provider) {
      console.log('provider not available....');
      return;
    }

    if (typeof checkedAction.action === 'number') {
      // NOTE: this cannot reach in here, as the number are filtered in onAccountCHange
      if (now() - checkedAction.action > deletionDelay) {
        console.log(`already number, delay over, deleting ${checkedAction.id}`);
        account.deletePendingAction(checkedAction.id);
      }
      return;
    }

    if (checkedAction.final && checkedAction.status !== 'PENDING' && checkedAction.status !== 'LOADING') {
      await this._handleFinalAcknowledgement(checkedAction, checkedAction.final, checkedAction.status);
      return;
    } else if (checkedAction.final && checkedAction.action.external) {
      await this._handleFinalAcknowledgement(checkedAction, checkedAction.final, checkedAction.action.external.status);
      return;
    }

    let changes = false;

    if (checkedAction.id === 'undefined') {
      if (checkedAction.status !== 'FAILURE' || !checkedAction.final) {
        checkedAction.status = 'FAILURE';
        checkedAction.final = now();
        this._notify();
      }
      return;
    }

    const txFromPeers = await wallet.provider.getTransaction(checkedAction.id);
    let pending = true;
    if (txFromPeers) {
      let receipt;
      if (txFromPeers.blockNumber) {
        receipt = await wallet.provider.getTransactionReceipt(checkedAction.id);
      }
      if (receipt) {
        const block = await wallet.provider.getBlock(txFromPeers.blockHash);
        if (block) {
          pending = false;
          const final = receipt.confirmations >= finality;
          if (receipt.status === 0) {
            if (checkedAction.status !== 'FAILURE' || checkedAction.final !== block.timestamp) {
              checkedAction.status = 'FAILURE';
              checkedAction.txTimestamp = block.timestamp;
              changes = true;
              checkedAction.final = final ? block.timestamp : undefined;
            }
            if (final) {
              await this._handleFinalAcknowledgement(checkedAction, block.timestamp, 'FAILURE');
            }
          } else {
            if (checkedAction.status !== 'SUCCESS' || checkedAction.final !== block.timestamp) {
              checkedAction.status = 'SUCCESS';
              checkedAction.txTimestamp = block.timestamp;
              changes = true;
              checkedAction.final = final ? block.timestamp : undefined;
            }
            if (final) {
              await this._handleFinalAcknowledgement(checkedAction, block.timestamp, 'SUCCESS');
            }
          }
        }
      }
    } else {
      const latestFinalizedBlockNumber = Math.max(blockNumber - finality, 0);
      const latestFinalizedBlock = await wallet.provider.getBlock(latestFinalizedBlockNumber);
      const finalityNonce = await wallet.provider.getTransactionCount(
        checkedAction.action.txOrigin || ownerAddress,
        latestFinalizedBlock.hash
      );
      // NOTE: we feteched it again to ensure the call was not lost
      const txFromPeers = await wallet.provider.getTransaction(checkedAction.id);
      if (txFromPeers) {
        return; // TODO should we do the above here : `if (txFromPeers.blockNumber) {`
      }
      if (typeof checkedAction.action.nonce === 'number' && finalityNonce > checkedAction.action.nonce) {
        pending = false;

        if (checkedAction.status !== 'CANCELED' || !checkedAction.final) {
          let cancelled = false;
          if (checkedAction.action.type === 'SEND') {
            const contracts = wallet.contracts || fallback.contracts;
            if (!contracts) {
              console.log(`no contracts setup, skip for now`);
              return;
            }
            const fleet = await contracts.OuterSpace.getFleet(checkedAction.action.fleetId, '0', {
              blockTag: latestFinalizedBlock.hash,
            });
            if (fleet.owner != '0x0000000000000000000000000000000000000000') {
              if (checkedAction.status !== 'SUCCESS' || !checkedAction.final) {
                checkedAction.status = 'SUCCESS';
                checkedAction.final = latestFinalizedBlock.timestamp;

                // console.log({savingActualLaunchTime: launchTime});
                // account.recordFleetLaunchTime(checkedAction.id, launchTime);
                // TODO This is not the actual tx, we should probably specify somewhere that it is a replaced tx
                checkedAction.txTimestamp = fleet.launchTime;

                // TODO what if the fleet do not have time to record launchTime (see fleets.ts)
                //  should we do it here instead ?
                await this._handleFinalAcknowledgement(checkedAction, latestFinalizedBlock.timestamp, 'SUCCESS');
                changes = true;
              }
            } else {
              cancelled = true;
            }
          } else {
            // TODO check other action for result,
            cancelled = true;
          }

          if (cancelled) {
            checkedAction.status = 'CANCELED';
            checkedAction.final = checkedAction.action.timestamp;
            await this._handleFinalAcknowledgement(checkedAction, checkedAction.action.timestamp, 'CANCELED');
            changes = true;
          }
        }
      }
    }

    if (pending) {
      if (now() - checkedAction.action.timestamp > 3600) {
        // 1 hour to TODO config
        if (checkedAction.status !== 'TIMEOUT' || checkedAction.final !== checkedAction.action.timestamp) {
          checkedAction.status = 'TIMEOUT';
          checkedAction.final = checkedAction.action.timestamp;
          await this._handleFinalAcknowledgement(checkedAction, checkedAction.action.timestamp, 'TIMEOUT');
          changes = true;
        }
      } else {
        if (checkedAction.status !== 'PENDING') {
          checkedAction.status = 'PENDING';
          changes = true;
        }
      }
    }

    if (this.ownerAddress !== ownerAddress) {
      return;
    }

    if (changes) {
      // console.log(`changes found for ${checkedAction.id}`);
      this._notify();
    } else {
      // console.log(`no change for ${checkedAction.id}`);
    }
  }

  private _stop(): void {
    if (this.stopAccountSubscription) {
      this.stopAccountSubscription();
      this.stopAccountSubscription = undefined;
    }
    if (this.stopChainTempoSubscription) {
      this.stopChainTempoSubscription();
      this.stopChainTempoSubscription = undefined;
    }
  }

  private _notify(): void {
    this.store.set(this.state);
  }
}

export const pendingActions = new PendingActionsStore();

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).pendingActions = pendingActions;
}
