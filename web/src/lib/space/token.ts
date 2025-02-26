import type {SpaceInfo} from 'conquest-eth-common';
import type {Readable, Writable} from 'svelte/store';
import {writable} from 'svelte/store';
import {spaceInfo} from './spaceInfo';
import type {SpaceQueryWithPendingState} from '$lib/space/optimisticSpace';
import {spaceQueryWithPendingActions} from '$lib/space/optimisticSpace';
import {BigNumber} from '@ethersproject/bignumber';
import {now} from '$lib/time';
import {wallet} from '$lib/blockchain/wallet';

export type MyToken = {
  playTokenBalance?: BigNumber;
  freePlayTokenBalance?: BigNumber;
  freePlayTokenClaimBalance?: BigNumber;
  playTokenAllowance?: BigNumber;
  freePlayTokenAllowance?: BigNumber;
  nativeBalance?: BigNumber;
};

export class MyTokenStore implements Readable<MyToken> {
  private readonly spaceInfo: SpaceInfo;
  private data: MyToken;

  private store: Writable<MyToken>;

  constructor(spaceInfo: SpaceInfo) {
    this.spaceInfo = spaceInfo;
    this.store = writable({});
    spaceQueryWithPendingActions.subscribe(this.onSpaceUpdate.bind(this));
  }

  private getPendingSpending(
    update: SpaceQueryWithPendingState,
    playTokenBalance: BigNumber,
    freePlayTokenBalance: BigNumber
  ): {playTokenDelta: BigNumber; freePlayTokenDelta: BigNumber} {
    let playTokenDelta = BigNumber.from(0);
    let freePlayTokenDelta = BigNumber.from(0);
    const pendingActions = update.pendingActions;
    for (const pendingAction of pendingActions) {
      if (pendingAction.counted) {
        continue;
      }
      if (pendingAction.action.type === 'CAPTURE') {
        const captureAction = pendingAction.action;
        // TODO
        if (pendingAction.status === 'FAILURE') {
        } else if (pendingAction.status === 'CANCELED') {
        } else if (pendingAction.status === 'TIMEOUT') {
        } else if (
          pendingAction.status === 'PENDING' ||
          // TODO better? we give LOADING 60 seconds counting from tx submission
          (pendingAction.status === 'LOADING' && now() - pendingAction.action.timestamp < 60)
        ) {
          if (captureAction.planetCoords) {
            const planetInfos = captureAction.planetCoords.map((v) => spaceInfo.getPlanetInfo(v.x, v.y));
            for (const planetInfo of planetInfos) {
              const numTokens = BigNumber.from(planetInfo.stats.stake).mul('100000000000000');
              if (freePlayTokenBalance.sub(freePlayTokenDelta).gte(numTokens)) {
                freePlayTokenDelta = freePlayTokenDelta.add(numTokens);
              } else {
                playTokenDelta = playTokenDelta.add(numTokens);
              }
            }
          }
        }
      }
    }
    return {playTokenDelta, freePlayTokenDelta};
  }

  async updateNativeBalance() {
    const nativeBalance = await wallet.provider?.getBalance(wallet.address);
    if (nativeBalance) {
      this.store.update((s: MyToken) => {
        s.nativeBalance = nativeBalance;
        return s;
      });
    }
  }

  private onSpaceUpdate(update: SpaceQueryWithPendingState): void {
    this.updateNativeBalance();
    // console.log({update});
    const updatePlayer = update.queryState.data?.player?.id;
    if (!updatePlayer) {
      this.data = {};
    } else {
      let playTokenBalance = update.queryState.data.player.playTokenBalance;
      let freePlayTokenBalance = update.queryState.data.player.freePlayTokenBalance;
      const {playTokenDelta, freePlayTokenDelta} = this.getPendingSpending(
        update,
        playTokenBalance,
        freePlayTokenBalance
      );
      playTokenBalance = playTokenBalance.sub(playTokenDelta);
      freePlayTokenBalance = freePlayTokenBalance.sub(freePlayTokenDelta);
      if (playTokenBalance.lt(0)) {
        playTokenBalance = BigNumber.from(0);
      }
      if (freePlayTokenBalance.lt(0)) {
        freePlayTokenBalance = BigNumber.from(0);
      }
      const freePlayTokenClaimBalance = update.queryState.data.player.freePlayTokenClaimBalance;

      this.data = {playTokenBalance, freePlayTokenBalance, freePlayTokenClaimBalance};
    }
    this.store.set(this.data);
  }

  subscribe(run: (value: MyToken) => void, invalidate?: (value?: MyToken) => void): () => void {
    return this.store.subscribe(run, invalidate);
  }
}

export const myTokens = new MyTokenStore(spaceInfo);

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).myTokens = myTokens;
}
