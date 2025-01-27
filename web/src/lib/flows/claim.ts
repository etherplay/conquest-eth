import {wallet} from '$lib/blockchain/wallet';
import {BaseStoreWithData} from '$lib/utils/stores/base';
import {spaceInfo} from '$lib/space/spaceInfo';
import {BigNumber} from '@ethersproject/bignumber';
import {defaultAbiCoder} from '@ethersproject/abi';
import {TutorialSteps} from '$lib/account/constants';
import {account} from '$lib/account/account';
import {privateWallet} from '$lib/account/privateWallet';
import {xyToLocation} from 'conquest-eth-common';
import {myTokens} from '$lib/space/token';
import {get} from 'svelte/store';
import {initialContractsInfos} from '$lib/blockchain/contracts';
import {getGasPrice} from './gasPrice';

type Data = {txHash?: string; coords: {x: number; y: number}};
export type ClaimFlow = {
  type: 'CLAIM';
  step:
    | 'IDLE'
    | 'CONNECTING'
    | 'CHOOSE_STAKE'
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

  async claim(coords: {x: number; y: number}): Promise<void> {
    this.setPartial({data: {coords}, step: 'CONNECTING'});
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
      this.setPartial({
        step: 'CHOOSE_STAKE',
        error: e,
      });
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
      this.setPartial({step: 'CHOOSE_STAKE', error: err});
      throw err;
    }

    this.setPartial({step: 'CHECKING_ALLOWANCE'});
    try {
      await tx.wait();
    } finally {
      this.setPartial({step: 'CHOOSE_STAKE'});
    }
  }

  async confirm(requireMint?: {amountToMint: BigNumber; tokenAvailable: BigNumber}): Promise<void> {
    // await privateWallet.execute(async () => {
    await privateWallet.login();
    const flow = this.setPartial({step: 'CREATING_TX'});
    if (!flow.data) {
      this.setPartial({
        step: 'CHOOSE_STAKE',
        error: new Error(`no flow data`),
      });
      return;
    }
    if (!wallet.provider) {
      this.setPartial({
        step: 'CHOOSE_STAKE',
        error: new Error(`no provider`),
      });
      return;
    }
    let latestBlock;
    try {
      latestBlock = await wallet.provider.getBlock('latest');
    } catch (e) {
      this.setPartial({
        step: 'CHOOSE_STAKE',
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
      this.setPartial({
        step: 'CHOOSE_STAKE',
        error: e,
      });
      return;
    }

    let currentNativeBalance;
    try {
      currentNativeBalance = await wallet.provider.getBalance(wallet.address);
    } catch (e) {
      this.setPartial({
        step: 'CHOOSE_STAKE',
        error: e,
      });
      return;
    }

    // console.log('HELLO');
    const planetInfo = spaceInfo.getPlanetInfo(flow.data.coords.x, flow.data.coords.y);
    if (!planetInfo) {
      this.setPartial({
        step: 'CHOOSE_STAKE',
        error: new Error(`no planet at ${flow.data.coords.x}, ${flow.data.coords.y}`),
      });
      return;
    }

    if (!account.isReady()) {
      this.setPartial({
        step: 'CHOOSE_STAKE',
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

    const locationId = xyToLocation(flow.data.coords.x, flow.data.coords.y);
    let tokenAmount = spaceInfo.roundTo1Decimal
      ? BigNumber.from(planetInfo.stats.stake).mul('100000000000000')
      : BigNumber.from(planetInfo.stats.stake * 10000).mul('10000000000');
    let paymentTokenContract = wallet?.contracts.PlayToken;
    if (get(myTokens).freePlayTokenBalance.gte(tokenAmount)) {
      paymentTokenContract = wallet?.contracts.FreePlayToken;
    }
    let callData = defaultAbiCoder.encode(['address', 'uint256'], [wallet.address, locationId]);

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
        this.setPartial({
          step: 'CHOOSE_STAKE',
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
              this.setPartial({error: e, step: 'CHOOSE_STAKE'});
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
        gasEstimation = await outerspaceContract.estimateGas.acquireViaNativeTokenAndStakingToken(
          locationId,
          requireMint.amountToMint,
          requireMint.tokenAvailable,
          {value: nativeTokenAmount}
        );
      } catch (e) {
        console.error(e);
        this.setPartial({
          step: 'CHOOSE_STAKE',
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
        tx = await outerspaceContract.acquireViaNativeTokenAndStakingToken(
          locationId,
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
              this.setPartial({error: e, step: 'CHOOSE_STAKE'});
            }
          } else {
            throw e;
          }
          return;
        }
      }
    }

    // TODO check ? check what ? (need to give better comments :D)
    account.recordCapture(flow.data.coords, tx.hash, latestBlock.timestamp, tx.nonce);

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
    this.setPartial({step: 'CHOOSE_STAKE', cancelingConfirmation: false});
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
