import {wallet} from '$lib/blockchain/wallet';
import {privateWallet} from '$lib/account/privateWallet';
import {account} from '$lib/account/account';
import type {PlanetInfo} from 'conquest-eth-common';
import {xyToLocation} from 'conquest-eth-common';
import {spaceInfo} from '$lib/space/spaceInfo';
import {BaseStoreWithData} from '$lib/utils/stores/base';
import {correctTime, isCorrected} from '$lib/time';
import {TutorialSteps} from '$lib/account/constants';
import {agentService} from '$lib/account/agentService';
import type {Player} from '$lib/space/playersQuery';
import {playersQuery} from '$lib/space/playersQuery';
import {planets} from '$lib/space/planets';
import {get} from 'svelte/store';
import {formatError} from '$lib/utils';
import {BigNumber} from '@ethersproject/bignumber';
import {Contract} from '@ethersproject/contracts';

export type VirtualFleet = {
  from: PlanetInfo;
  to: PlanetInfo;
};

type PlanetCoords = {x: number; y: number};
export type LastFleet = {
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
  };
  timestamp: number;
  nonce: number;
  useAgentService: boolean;
  extra: {
    secretHash;
    distance;
    minDuration;
  };
};

type SendConfig = {
  fleetOwner?: string;
  numSpaceshipsToKeep?: number;
  numSpaceshipsAvailable?: number;
  abi?: any;
  contractAddress?: string;
  numSpaceships?: number;
  pricePerUnit?: string;
  args?: any[];
  fleetSender?: string;
  msgValue?: string;
  arrivalTimeWanted?: number;
  // TODO fix numSPaceships option ?
  //  or we could have a callback function, msg type to send to iframe to get the price for every change of amount
};

type Data = {
  txHash?: string;
  to: {x: number; y: number};
  gift: boolean;
  from: {x: number; y: number};
  fleetAmount: number;
  useAgentService: boolean;
  config?: SendConfig;
  force?: boolean;
};

export type SendFlow = {
  type: 'SEND';
  step:
    | 'IDLE'
    | 'CONNECTING'
    | 'INACTIVE_PLANET'
    | 'PICK_DESTINATION'
    | 'PICK_ORIGIN'
    | 'TUTORIAL_PRE_FLEET_AMOUNT'
    | 'TUTORIAL_PRE_TRANSACTION'
    | 'CHOOSE_FLEET_AMOUNT'
    | 'CREATING_TX'
    | 'WAITING_TX'
    | 'SUCCESS';
  cancelingConfirmation?: boolean;
  pastStep:
    | 'IDLE'
    | 'CONNECTING'
    | 'INACTIVE_PLANET'
    | 'PICK_DESTINATION'
    | 'PICK_ORIGIN'
    | 'TUTORIAL_PRE_FLEET_AMOUNT'
    | 'TUTORIAL_PRE_TRANSACTION'
    | 'CHOOSE_FLEET_AMOUNT'
    | 'CREATING_TX'
    | 'WAITING_TX'
    | 'SUCCESS';
  data?: Data;
  error?: {message?: string; type?: string};
  lastFleet?: LastFleet;
};

export function virtualFleetFrom(sendFlowData: Data, pos: {x: number; y: number}): VirtualFleet {
  return {
    from: spaceInfo.getPlanetInfo(pos.x, pos.y),
    // owner: '0x0000000000000000000000000000000000000000', // TODO
    to: spaceInfo.getPlanetInfo(sendFlowData.to.x, sendFlowData.to.y),
  };
}

export function virtualFleetTo(sendFlowData: Data, pos: {x: number; y: number}): VirtualFleet {
  return {
    from: spaceInfo.getPlanetInfo(sendFlowData.from.x, sendFlowData.from.y),
    // owner: '0x0000000000000000000000000000000000000000', // TODO
    to: spaceInfo.getPlanetInfo(pos.x, pos.y),
  };
}

function findCommonAlliances(arr1: string[], arr2: string[]): string[] {
  const result = [];
  for (const item1 of arr1) {
    if (arr2.indexOf(item1) !== -1) {
      result.push(item1);
    }
  }
  return result;
}

class SendFlowStore extends BaseStoreWithData<SendFlow, Data> {
  constructor() {
    super({
      type: 'SEND',
      step: 'IDLE',
      pastStep: 'IDLE',
    });
  }

  isGift(): boolean {
    return this.$store.data?.gift || false;
  }

  async sendFrom(from: {x: number; y: number}, config?: SendConfig): Promise<void> {
    if (this.$store.step == 'PICK_ORIGIN') {
      this.pickOrigin(from, config);
    } else {
      await privateWallet.login();
      if (config) {
        this.setData(
          {from, config},
          {step: 'PICK_DESTINATION', pastStep: 'PICK_DESTINATION', cancelingConfirmation: undefined}
        );
      } else {
        this.setData(
          {from},
          {step: 'PICK_DESTINATION', pastStep: 'PICK_DESTINATION', cancelingConfirmation: undefined}
        );
      }
    }
  }

  async sendToInactivePlanet(to: {x: number; y: number}): Promise<void> {
    this.setData({to}, {step: 'INACTIVE_PLANET', cancelingConfirmation: undefined});
  }

  async sendTo(to: {x: number; y: number}): Promise<void> {
    if (this.$store.step == 'PICK_DESTINATION') {
      this.pickDestination(to);
    } else {
      await privateWallet.login();
      this.setData({to}, {step: 'PICK_ORIGIN', pastStep: 'PICK_ORIGIN', cancelingConfirmation: undefined});
    }
  }

  async pickDestination(to: {x: number; y: number}): Promise<void> {
    if (this.$store.step !== 'PICK_DESTINATION') {
      throw new Error(`Need to be in step PICK_DESTINATION`);
    }
    this.setData({to});
    this._chooseFleetAmount();
  }

  async pickOrigin(from: {x: number; y: number}, config?: SendConfig): Promise<void> {
    if (this.$store.step !== 'PICK_ORIGIN') {
      throw new Error(`Need to be in step PICK_ORIGIN`);
    }
    if (config) {
      this.setData({from, config});
    } else {
      this.setData({from});
    }

    this._chooseFleetAmount();
  }

  async _chooseFleetAmount() {
    const flow = this.setPartial({step: 'CREATING_TX'});
    if (flow.data) {
      const to = flow.data.to;
      const toPlanetInfo = spaceInfo.getPlanetInfo(to.x, to.y);
      const destinationPlanetState = get(planets.planetStateFor(toPlanetInfo));
      if (destinationPlanetState.owner) {
        if (destinationPlanetState.owner === wallet.address.toLowerCase()) {
          this.setData({gift: true});
        } else {
          await playersQuery.triggerUpdate();
          const me = playersQuery.getPlayer(wallet.address.toLowerCase());
          const destinationOwner = playersQuery.getPlayer(destinationPlanetState.owner);
          if (me && me.alliances.length > 0 && destinationOwner && destinationOwner.alliances.length > 0) {
            const potentialAlliances = findCommonAlliances(
              me.alliances.map((v) => v.address),
              destinationOwner.alliances.map((v) => v.address)
            );
            if (potentialAlliances.length > 0) {
              this.setData({gift: true});
            }
          }
        }
      }
    }

    if (!account.isWelcomingStepCompleted(TutorialSteps.TUTORIAL_FLEET_AMOUNT)) {
      this.setPartial({step: 'TUTORIAL_PRE_FLEET_AMOUNT'});
    } else {
      this.setPartial({step: 'CHOOSE_FLEET_AMOUNT'});
    }
  }

  async acknowledgeWelcomingStep1() {
    account.recordWelcomingStep(TutorialSteps.TUTORIAL_FLEET_AMOUNT);
    this._chooseFleetAmount();
  }

  confirm(
    fleetAmount: number,
    gift: boolean,
    useAgentService: boolean,
    fleetOwner: string,
    arrivalTimeWanted: number | undefined,
    force: boolean
  ) {
    this.setData({
      fleetAmount,
      gift,
      useAgentService,
      config: {
        fleetOwner,
        arrivalTimeWanted,
      },
      force,
    });
    if (!account.isWelcomingStepCompleted(TutorialSteps.TUTORIAL_FLEET_PRE_TRANSACTION)) {
      this.setPartial({step: 'TUTORIAL_PRE_TRANSACTION'});
    } else {
      this._confirm(fleetAmount, gift, useAgentService, force);
    }
  }

  async acknowledgeWelcomingStep2() {
    if (!this.$store.data?.fleetAmount) {
      throw new Error(`not fleetAmount recorded`);
    }
    if (this.$store.data?.gift === undefined) {
      throw new Error(`not gift recorded`);
    }
    account.recordWelcomingStep(TutorialSteps.TUTORIAL_FLEET_PRE_TRANSACTION);
    this.confirm(
      this.$store.data?.fleetAmount,
      this.$store.data?.gift,
      this.$store.data?.useAgentService,
      this.$store.data?.config?.fleetOwner,
      this.$store.data?.config?.arrivalTimeWanted,
      this.$store.data?.force
    );
  }

  async _confirm(fleetAmount: number, gift: boolean, useAgentService: boolean, force: boolean): Promise<void> {
    const flow = this.setPartial({step: 'CREATING_TX', cancelingConfirmation: undefined});
    if (!flow.data) {
      throw new Error(`no data for send flow`);
    }

    const from = flow.data.from;
    const to = flow.data.to;
    const fromPlanetInfo = spaceInfo.getPlanetInfo(from.x, from.y);
    const toPlanetInfo = spaceInfo.getPlanetInfo(to.x, to.y);
    if (!fromPlanetInfo || !toPlanetInfo) {
      throw new Error(`cannot get to or from planet info`);
    }
    if (!wallet.address) {
      throw new Error(`no wallet address`);
    }
    if (!wallet.provider) {
      throw new Error(`no provider`);
    }

    // TODO limit possible pricing
    //  allow to set a specific amount of spaceship and a specific price, set pricePerUnit to be undefined and price to be the price to pay
    const pricePerUnit = flow.data.config?.pricePerUnit ? BigNumber.from(flow.data.config?.pricePerUnit) : undefined;
    const walletAddress = wallet.address.toLowerCase();
    const fleetOwner = flow.data.config?.fleetOwner || walletAddress;
    const fleetSender = flow.data.config?.fleetSender || walletAddress;
    const msgValueString = flow.data.config?.msgValue;
    const operator = flow.data.config?.contractAddress || walletAddress;
    const arrivalTimeWanted = flow.data.config?.arrivalTimeWanted || 0;

    let latestBlock;
    try {
      latestBlock = await wallet.provider.getBlock('latest');
    } catch (e) {
      this.setPartial({
        step: 'CHOOSE_FLEET_AMOUNT',
        error: e,
      });
      return;
    }
    if (!isCorrected) {
      // TODO extreact or remove (assume time will be corrected by then)
      correctTime(latestBlock.timestamp);
    }

    // TODO option in UI ?
    let specific = '0x0000000000000000000000000000000000000001';

    let potentialAlliances: string[] = [];

    const destinationPlanetState = get(planets.planetStateFor(toPlanetInfo));
    let destinationOwner: Player | undefined;
    if (destinationPlanetState.owner) {
      try {
        await playersQuery.triggerUpdate();
      } catch (e) {
        this.setPartial({
          step: 'CHOOSE_FLEET_AMOUNT',
          error: e,
        });
        return;
      }
      const me = playersQuery.getPlayer(fleetOwner);
      destinationOwner = playersQuery.getPlayer(destinationPlanetState.owner);
      console.log({me, destinationOwner});
      if (me && me.alliances.length > 0 && destinationOwner && destinationOwner.alliances.length > 0) {
        potentialAlliances = findCommonAlliances(
          me.alliances.map((v) => v.address),
          destinationOwner.alliances.map((v) => v.address)
        );
      }
    }
    // TODO && destinationOwner !== '0x0000000000000000000000000000000000000000' ?
    if (destinationOwner && !gift && destinationOwner.address === walletAddress) {
      specific = '0x0000000000000000000000000000000000000000'; //anyone
    } else if (destinationOwner && !gift && potentialAlliances.length > 0) {
      specific = destinationOwner.address; // specific to this particular enemy
      // TODO maybe instead target anyone ? '0x0000000000000000000000000000000000000000'; // no specific if an attack on an ally
      // TODO add option to specify: this address or any non-allies
      // or even : this alliance or any non-allies

      // TODO add ahent-service option to not resolve under certain condition
      // or switch to gifting based on a signature
    } else if (destinationOwner && gift && potentialAlliances.length == 0) {
      specific = destinationOwner.address; // specific to this particular address
      // TODO maybe instead target anyone ? '0x0000000000000000000000000000000000000000';
      // TODO add option to specify: this address or any allies

      // TODO add ahent-service option to not resolve under certain condition
      // or switch to gifting based on a signature
    }

    let nonce: number;
    try {
      nonce = await wallet.provider.getTransactionCount(walletAddress);
    } catch (e) {
      this.setPartial({
        step: 'CHOOSE_FLEET_AMOUNT',
        error: e,
      });
      return;
    }

    const distance = spaceInfo.distance(fromPlanetInfo, toPlanetInfo);
    const minDuration = spaceInfo.timeToArrive(fromPlanetInfo, toPlanetInfo);

    const {toHash, fleetId, secretHash} = await account.hashFleet(
      from,
      to,
      gift,
      specific,
      arrivalTimeWanted,
      nonce,
      fleetOwner,
      fleetSender,
      operator
    );

    console.log({
      from,
      to,
      gift,
      specific,
      arrivalTimeWanted,
      nonce,
      fleetOwner,
      fleetSender,
      operator,
      toHash,
      fleetId,
      secretHash,
    });

    // let currentGasPrice;
    // try {
    //   currentGasPrice = await wallet.provider.getGasPrice();
    // } catch (e) {
    //   this.setPartial({
    //     step: 'IDLE',
    //     error: e,
    //   });
    //   return;
    // }
    // const gasPrice = currentGasPrice.mul(2);
    const gasPrice = undefined;

    // console.log({potentialAlliances});

    const abi = flow.data.config?.abi;
    const args = flow.data.config?.args;
    if (args) {
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '{numSpaceships}') {
          args[i] = flow.data.fleetAmount;
        } else if (args[i] === '{toHash}') {
          args[i] = toHash;
        } else if (args[i] === '{numSpaceships*pricePerUnit}') {
          // TODO dynamic value (not only '{numSpaceships*pricePerUnit}')
          args[i] = pricePerUnit.mul(flow.data.fleetAmount);
        } else if (args[i] === '{fleetOwner}') {
          args[i] = fleetOwner;
        }
      }
    }

    // TODO dynamic value (not only '{numSpaceships*pricePerUnit}')
    let msgValue = BigNumber.from(0);
    if (msgValueString === '{numSpaceships*pricePerUnit}') {
      msgValue = pricePerUnit.mul(flow.data.fleetAmount);
    } else if (msgValueString) {
      msgValue = BigNumber.from(msgValueString);
    }

    let gasEstimation: BigNumber;

    if (force) {
      gasEstimation = BigNumber.from(2000000);
    } else {
      try {
        if (abi) {
          // create a contract interface for the purchase call
          const contract = new Contract(operator, [abi], wallet.provider.getSigner());
          gasEstimation = await contract.estimateGas[abi.name](...args, {
            value: msgValue,
          });
        } else {
          gasEstimation = await wallet.contracts?.OuterSpace.estimateGas.sendFor({
            fleetSender,
            fleetOwner,
            from: xyToLocation(from.x, from.y),
            quantity: fleetAmount,
            toHash,
          });
        }
      } catch (e) {
        this.setPartial({
          step: 'CHOOSE_FLEET_AMOUNT',
          error: e,
        });
        return;
      }
    }
    // TODO gasEstimation for SEND
    const gasLimit = gasEstimation.add(100000);

    this.setPartial({
      step: 'WAITING_TX',
      lastFleet: {
        fleet: {
          id: fleetId,
          to, // TODO handle it better
          from,
          fleetAmount,
          arrivalTimeWanted,
          gift,
          specific,
          potentialAlliances,
          owner: fleetOwner,
          fleetSender,
          operator,
        },
        timestamp: latestBlock.timestamp,
        nonce, // tx.nounce can be different it seems, metamask can change it, or maybe be even user
        useAgentService,
        extra: {
          secretHash,
          distance,
          minDuration,
        },
      },
    });
    let tx: {hash: string; nonce?: number};
    try {
      if (abi) {
        // create a contract interface for the purchase call
        const contract = new Contract(operator, [abi], wallet.provider.getSigner());
        tx = await contract[abi.name](...args, {
          nonce,
          gasPrice,
          value: msgValue,
          gasLimit,
        });
      } else {
        // console.log(`sending `, {
        //   fleetSender,
        //   fleetOwner,
        //   from,
        //   quantity: fleetAmount,
        //   toHash,
        // });
        tx = await wallet.contracts?.OuterSpace.sendFor(
          {
            fleetSender,
            fleetOwner,
            from: xyToLocation(from.x, from.y),
            quantity: fleetAmount,
            toHash,
          },
          {
            nonce,
            gasPrice,
            gasLimit,
          }
        );
        // tx = await wallet.contracts?.OuterSpace.send(xyToLocation(from.x, from.y), fleetAmount, toHash, {
        //   nonce,
        //   gasPrice,
        // });
      }
    } catch (e) {
      // console.error(e);
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
        console.error(e);
        if (e.message && e.message.indexOf('User denied') >= 0) {
          this.setPartial({
            step: 'IDLE',
            error: undefined,
          });
          return;
        }
        this.setPartial({error: e, step: 'CHOOSE_FLEET_AMOUNT'});
        return;
      }
    }

    // const gToX = toPlanetInfo.location.globalX;
    // const gToY = toPlanetInfo.location.globalY;
    // const gFromX = fromPlanetInfo.location.globalX;
    // const gFromY = fromPlanetInfo.location.globalY;
    // const speed = fromPlanetInfo.stats.speed;
    // const fullDistance = Math.floor(Math.sqrt(Math.pow(gToX - gFromX, 2) + Math.pow(gToY - gFromY, 2)));
    // const fleetDuration = fullDistance * ((spaceInfo.timePerDistance * 10000) / speed);

    account.recordFleet(
      {
        id: fleetId,
        to, // TODO handle it better
        from,
        fleetAmount,
        arrivalTimeWanted,
        gift,
        specific,
        potentialAlliances,
        owner: fleetOwner,
        fleetSender,
        operator,
      },
      tx.hash,
      latestBlock.timestamp,
      nonce // tx.nounce can be different it seems, metamask can change it, or maybe be even user
    );

    this.setData({txHash: tx.hash}, {step: 'SUCCESS'});

    if (useAgentService) {
      try {
        const {queueID} = await agentService.submitReveal(
          fleetId,
          secretHash,
          from,
          to,
          distance,
          arrivalTimeWanted,
          gift,
          specific,
          potentialAlliances,
          latestBlock.timestamp,
          minDuration,
          fleetSender,
          operator
        );
        account.recordQueueID(tx.hash, queueID);
      } catch (e) {
        this.setPartial({error: {message: formatError(e), type: 'AGENT_SERVICE_SUBMISSION_ERROR'}});
      }
    }
  }

  async cancelCancelation(): Promise<void> {
    this.setPartial({cancelingConfirmation: false});
  }

  async recoverFleetFromTxHash(txHash: string) {
    if (!txHash) {
      this.setPartial({error: {message: `no tx hash specified`}});
      return;
    }
    const tx = await wallet.provider.getTransaction(txHash);
    if (!tx || !tx.hash) {
      this.setPartial({error: {message: `no tx found with hash : ${txHash}`}});
      return;
    }
    const lastFleet = this.$store.lastFleet;
    if (lastFleet) {
      console.log({lastFleet});
      account.recordFleet(
        lastFleet.fleet,
        tx.hash,
        lastFleet.timestamp,
        lastFleet.nonce // tx.nonce can be different it seems, metamask can change it, or maybe be even user
        //  so we should actually use a different fieldName: secretNonce to save lastFleet.nonce
      );

      this.setData({txHash: txHash}, {step: 'SUCCESS', cancelingConfirmation: false});

      if (lastFleet.useAgentService) {
        try {
          const {queueID} = await agentService.submitReveal(
            lastFleet.fleet.id,
            lastFleet.extra.secretHash,
            lastFleet.fleet.from,
            lastFleet.fleet.to,
            lastFleet.extra.distance,
            lastFleet.fleet.arrivalTimeWanted,
            lastFleet.fleet.gift,
            lastFleet.fleet.specific,
            lastFleet.fleet.potentialAlliances,
            lastFleet.timestamp,
            lastFleet.extra.minDuration,
            lastFleet.fleet.fleetSender,
            lastFleet.fleet.operator
          );
          account.recordQueueID(txHash, queueID);
        } catch (e) {
          this.setPartial({error: {message: formatError(e), type: 'AGENT_SERVICE_SUBMISSION_ERROR'}});
        }
      }
    }
  }

  async cancel(cancelingConfirmation = false): Promise<void> {
    if (cancelingConfirmation) {
      this.setPartial({cancelingConfirmation: true});
    } else {
      this._reset();
    }
  }

  async back(): Promise<void> {
    if (this.$store.pastStep === 'PICK_DESTINATION') {
      this.setData({to: undefined});
    } else if (this.$store.pastStep === 'PICK_ORIGIN') {
      this.setData({from: undefined});
    }
    this.setPartial({step: this.$store.pastStep});
  }

  async acknownledgeSuccess(): Promise<void> {
    this._reset();
  }

  async acknownledgeError(): Promise<void> {
    this.setPartial({error: undefined});
  }

  private _reset() {
    this.setPartial({step: 'IDLE', data: undefined});
  }
}

const store = new SendFlowStore();
export default store;

// TODO remove
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ('undefined' !== typeof window) (window as any).sendFlow = store;
