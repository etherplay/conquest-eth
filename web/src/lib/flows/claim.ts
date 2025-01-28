import {wallet} from '$lib/blockchain/wallet';
import {BaseStoreWithData} from '$lib/utils/stores/base';
import {spaceInfo} from '$lib/space/spaceInfo';
import {BigNumber} from '@ethersproject/bignumber';
import {defaultAbiCoder} from '@ethersproject/abi';
import {TutorialSteps} from '$lib/account/constants';
import {account} from '$lib/account/account';
import {privateWallet} from '$lib/account/privateWallet';
import type {PlanetInfo} from 'conquest-eth-common';
import {myTokens} from '$lib/space/token';
import {get} from 'svelte/store';
import {initialContractsInfos} from '$lib/blockchain/contracts';
import {getGasPrice} from './gasPrice';
import selection from '$lib/map/selection';

type Data = {txHash?: string; coords: {x: number; y: number}[]};
export type ClaimFlow = {
  type: 'CLAIM';
  step:
    | 'IDLE'
    | 'CONNECTING'
    | 'CHOOSE_STAKE'
    | 'ADD_MORE'
    | 'CREATING_TX'
    | 'WAITING_TX'
    | 'PROFILE_INFO'
    | 'SUCCESS'
    | 'REQUIRE_ALLOWANCE'
    | 'SETTING_ALLOWANCE'
    | 'CHECKING_ALLOWANCE'
    | 'NOT_ENOUGH_NATIVE_TOKEN';
  cancelingConfirmation?: boolean;
  data?: Data;
  error?: {message?: string}; // TODO other places: add message as optional field
};

class ClaimFlowStore extends BaseStoreWithData<ClaimFlow, Data> {
  public constructor() {
    super({
      type: 'CLAIM',
      step: 'IDLE',
    });
  }

  async cancelCancelation(): Promise<void> {
    this.setPartial({cancelingConfirmation: false});
  }

  async cancel(cancelingConfirmation = false): Promise<void> {
    if (cancelingConfirmation) {
      this.setPartial({cancelingConfirmation: true});
    } else {
      this._reset();
    }
  }

  async acknownledgeSuccess(): Promise<void> {
    // TODO automatic ?
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  async askForMore() {
    selection.unselect();
    this.setPartial({step: 'ADD_MORE', cancelingConfirmation: false});
  }

  async addMore(coords: {x: number; y: number}) {
    const newCoords = [...this.$store.data.coords, {...coords}];
    this.setPartial({data: {coords: newCoords}});
  }

  remove(coords: {x: number; y: number}) {
    const newCoords = this.$store.data.coords.filter((v) => v.x != coords.x || v.y != coords.y);
    if (newCoords.length === 0) {
      this._reset();
    } else {
      this.setPartial({data: {coords: newCoords}});
    }
  }

  async claim(coords: {x: number; y: number}): Promise<void> {
    this.setPartial({data: {coords: [{...coords}]}, step: 'CONNECTING'});

    await privateWallet.login();
    this.setPartial({step: 'CHOOSE_STAKE', cancelingConfirmation: false});
  }

  async allowConquestToTransferToken(): Promise<void> {
    this.setPartial({step: 'SETTING_ALLOWANCE'});

    let maxFeePerGas: BigNumber;
    let maxPriorityFeePerGas;
    try {
      const gasPrice = await getGasPrice(wallet.web3Provider);
      maxFeePerGas = gasPrice.maxFeePerGas;
      maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
    } catch (e) {
      this.backToWhereYouWere({error: e});
      return;
    }

    let tx;
    try {
      tx = await wallet!.contracts.PlayToken.approve(
        wallet!.contracts.OuterSpace.address,
        BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
        {
          maxFeePerGas,
          maxPriorityFeePerGas,
        }
      );
    } catch (err) {
      this.backToWhereYouWere({error: err});
      throw err;
    }

    this.setPartial({step: 'CHECKING_ALLOWANCE'});
    try {
      await tx.wait();
    } finally {
      this.backToWhereYouWere();
    }
  }

  backToWhereYouWere(object?: object) {
    if (this.$store.data?.coords.length > 0) {
      this.setPartial({step: 'ADD_MORE', ...object});
    } else {
      this.setPartial({step: 'CHOOSE_STAKE', ...object});
    }
  }

  async confirm(requireMint?: {amountToMint: BigNumber; tokenAvailable: BigNumber}): Promise<void> {
    // await privateWallet.execute(async () => {
    await privateWallet.login();
    const flow = this.setPartial({step: 'CREATING_TX'});
    if (!flow.data) {
      this.backToWhereYouWere({
        error: new Error(`no flow data`),
      });
      return;
    }
    if (!wallet.provider) {
      this.backToWhereYouWere({
        error: new Error(`no provider`),
      });
      return;
    }
    let latestBlock;
    try {
      latestBlock = await wallet.provider.getBlock('latest');
    } catch (e) {
      this.backToWhereYouWere({
        error: e,
      });
      return;
    }

    let maxFeePerGas: BigNumber;
    let maxPriorityFeePerGas;
    try {
      const gasPrice = await getGasPrice(wallet.web3Provider);
      maxFeePerGas = gasPrice.maxFeePerGas;
      maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
    } catch (e) {
      this.backToWhereYouWere({
        error: e,
      });
      return;
    }

    let currentNativeBalance;
    try {
      currentNativeBalance = await wallet.provider.getBalance(wallet.address);
    } catch (e) {
      this.backToWhereYouWere({
        error: e,
      });
      return;
    }

    const planetInfos: PlanetInfo[] = [];

    for (const coords of flow.data.coords) {
      // console.log('HELLO');
      const planetInfo = spaceInfo.getPlanetInfo(coords.x, coords.y);
      if (!planetInfo) {
        this.backToWhereYouWere({
          error: new Error(`no planet at ${coords.x}, ${coords.y}`),
        });
        return;
      } else {
        planetInfos.push(planetInfo);
      }
    }

    if (!account.isReady()) {
      this.backToWhereYouWere({
        error: new Error(`account not ready`),
      });
      return;
    }

    if (requireMint && requireMint.tokenAvailable.gt(0)) {
      const allowance = await wallet!.contracts.PlayToken.allowance(
        wallet.address,
        wallet!.contracts.OuterSpace.address
      );
      if (allowance.lt(requireMint.tokenAvailable)) {
        this.setPartial({
          step: 'REQUIRE_ALLOWANCE',
        });
        return;
      }
    }

    let tokenAmount: BigNumber = BigNumber.from(0);
    const locationIds: string[] = [];
    for (const planetInfo of planetInfos) {
      const tokenAmountToAdd = spaceInfo.roundTo1Decimal
        ? BigNumber.from(planetInfo.stats.stake).mul('100000000000000')
        : BigNumber.from(planetInfo.stats.stake * 10000).mul('10000000000');

      tokenAmount = tokenAmount.add(tokenAmountToAdd);
      locationIds.push(planetInfo.location.id);
    }

    let paymentTokenContract = wallet?.contracts.PlayToken;
    if (get(myTokens).freePlayTokenBalance.gte(tokenAmount)) {
      paymentTokenContract = wallet?.contracts.FreePlayToken;
    }
    console.log(wallet.address, locationIds);
    const callData = defaultAbiCoder.encode(['address', 'uint256[]'], [wallet.address, locationIds]);
    console.log({callData});

    // TODO add multiple claim
    // tokenAmount = tokenAmount.add(BigNumber.from("1900000000000000000"));
    // callData = defaultAbiCoder.encode(
    //       ['address', 'uint256[]'],
    //       [wallet.address, [xyToLocation(flow.data.coords.x, flow.data.coords.y), xyToLocation(11,-3)]]
    //     );
    //

    let tx: {hash: string; nonce?: number};

    if (!requireMint) {
      let gasEstimation: BigNumber;
      try {
        gasEstimation = await paymentTokenContract.estimateGas.transferAndCall(
          wallet.contracts?.OuterSpace.address,
          tokenAmount,
          callData
        );
      } catch (e) {
        this.backToWhereYouWere({
          error: e,
        });
        return;
      }
      // TODO gasEstimation for Acquire Planet
      const gasLimit = gasEstimation.add(100000);

      const valueNeeded = gasLimit.mul(maxFeePerGas);

      if (currentNativeBalance.lt(valueNeeded)) {
        this.setPartial({
          step: 'NOT_ENOUGH_NATIVE_TOKEN',
        });
        return;
      }

      this.setPartial({step: 'WAITING_TX'});
      try {
        tx = await paymentTokenContract.transferAndCall(wallet.contracts?.OuterSpace.address, tokenAmount, callData, {
          gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas,
        });
      } catch (e) {
        if (e.transactionHash) {
          tx = {hash: e.transactionHash};
          try {
            const tResponse = await wallet.provider.getTransaction(e.transactionHash);
            tx = tResponse;
          } catch (e) {
            console.log(`could not fetch tx, to get the nonce`);
          }
        }
        if (!tx || !tx.hash) {
          if (this.$store.step === 'WAITING_TX') {
            if (e.message && e.message.indexOf('User denied') >= 0) {
              this.setPartial({
                step: 'IDLE',
                error: undefined,
              });
            } else {
              console.error(`Error on transferAndCall:`, e);
              this.backToWhereYouWere({
                error: e,
              });
            }
          } else {
            throw e;
          }
          return;
        }
      }
    } else {
      const outerspaceContract = wallet?.contracts.OuterSpace;
      const nativeTokenAmount = requireMint.amountToMint
        .mul('1000000000000000000')
        .div(initialContractsInfos.contracts.PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals);

      if (currentNativeBalance.lt(nativeTokenAmount)) {
        this.setPartial({
          step: 'NOT_ENOUGH_NATIVE_TOKEN',
        });
        return;
      }
      let gasEstimation: BigNumber;
      try {
        gasEstimation = await outerspaceContract.estimateGas.acquireMultipleViaNativeTokenAndStakingToken(
          locationIds,
          requireMint.amountToMint,
          requireMint.tokenAvailable,
          {value: nativeTokenAmount}
        );
      } catch (e) {
        console.error(e);
        this.backToWhereYouWere({
          error: e,
        });
        return;
      }
      const gasLimit = gasEstimation.add(100000);

      const valueNeeded = gasLimit.mul(maxFeePerGas);

      if (currentNativeBalance.lt(valueNeeded)) {
        this.setPartial({
          step: 'NOT_ENOUGH_NATIVE_TOKEN',
        });
        return;
      }

      this.setPartial({step: 'WAITING_TX'});

      try {
        tx = await outerspaceContract.acquireMultipleViaNativeTokenAndStakingToken(
          locationIds,
          requireMint.amountToMint,
          requireMint.tokenAvailable,
          {
            gasLimit,
            value: nativeTokenAmount,
            maxFeePerGas,
            maxPriorityFeePerGas,
          }
        );
      } catch (e) {
        if (e.transactionHash) {
          tx = {hash: e.transactionHash};
          try {
            const tResponse = await wallet.provider.getTransaction(e.transactionHash);
            tx = tResponse;
          } catch (e) {
            console.log(`could not fetch tx, to get the nonce`);
          }
        }
        if (!tx || !tx.hash) {
          if (this.$store.step === 'WAITING_TX') {
            if (e.message && e.message.indexOf('User denied') >= 0) {
              this.setPartial({
                step: 'IDLE',
                error: undefined,
              });
            } else {
              console.error(`Error on transferAndCall:`, e);
              this.backToWhereYouWere({
                error: e,
              });
            }
          } else {
            throw e;
          }
          return;
        }
      }
    }

    // TODO check ? check what ? (need to give better comments :D)
    account.recordMultipleCapture(flow.data.coords, tx.hash, latestBlock.timestamp, tx.nonce);

    if (!account.isWelcomingStepCompleted(TutorialSteps.SUGGESTION_PROFILE)) {
      this.setData({txHash: tx.hash}, {step: 'PROFILE_INFO'});
    } else {
      this.setData({txHash: tx.hash}, {step: 'SUCCESS'});
    }
    // });
  }

  async acknowledgeProfileSuggestion() {
    account.recordWelcomingStep(TutorialSteps.SUGGESTION_PROFILE);
    if (this.$store.step === 'PROFILE_INFO') {
      this.setPartial({step: 'SUCCESS'});
    }
  }

  continueAfterOnRamp() {
    this.backToWhereYouWere({
      cancelCancelation: false,
    });
  }

  private _reset() {
    this.setPartial({step: 'IDLE', data: undefined, cancelingConfirmation: false});
  }
}
const store = new ClaimFlowStore();
export default store;

// TODO remove
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ('undefined' !== typeof window) (window as any).claimFlow = store;
