/* eslint-disable */
import {store, BigInt, Bytes} from '@graphprotocol/graph-ts';
import {flipHex, c2, ZERO, ONE, toPlanetId, toOwnerId, toFleetId, toEventId, toRewardId, ZERO_ADDRESS} from './utils';
import {handleOwner, handleOwnerViaId, handleSpace, updateChainAndReturnTransactionID} from './shared';
import {
  PlanetStake,
  FleetSent,
  FleetArrived,
  TravelingUpkeepRefund,
  StakeToWithdraw,
  PlanetExit,
  ExitComplete,
  RewardSetup,
  RewardToWithdraw,
  PlanetReset,
  Initialized,
  PlanetTransfer,
} from '../generated/OuterSpace/OuterSpaceContract';
import {
  Planet,
  Fleet,
  FleetSentEvent,
  FleetArrivedEvent,
  TravelingUpkeepRefundEvent,
  PlanetExitEvent,
  ExitCompleteEvent,
  StakeToWithdrawEvent,
  RewardSetupEvent,
  RewardToWithdrawEvent,
  Reward,
  PlanetStakeEvent,
  PlanetTransferEvent,
} from '../generated/schema';
import {log} from '@graphprotocol/graph-ts';

function handleReward(rewardId: BigInt, ownerId: string, planetId: string): Reward {
  let id = toRewardId(rewardId);
  let entity = Reward.load(id);
  if (entity) {
    return entity as Reward;
  }
  entity = new Reward(id);
  entity.owner = ownerId;
  entity.planet = planetId;
  entity.withdrawn = false;
  entity.save();
  return entity as Reward;
}

let UINT32_MAX = BigInt.fromUnsignedBytes(Bytes.fromHexString('0xFFFFFFFF') as Bytes);
function handleSpaceChanges(planet: Planet): void {
  let space = handleSpace();

  let x = planet.x;
  let y = planet.y;
  if (x.lt(ZERO)) {
    x = x.neg().plus(space.expansionDelta);
    if (x.gt(UINT32_MAX)) {
      x = UINT32_MAX;
    }
    if (space.minX.lt(x)) {
      space.minX = x;
    }
  } else {
    x = x.plus(space.expansionDelta);
    if (x.gt(UINT32_MAX)) {
      x = UINT32_MAX;
    }
    if (space.maxX.lt(x)) {
      space.maxX = x;
    }
  }

  if (y.lt(ZERO)) {
    y = y.neg().plus(space.expansionDelta);
    if (y.gt(UINT32_MAX)) {
      y = UINT32_MAX;
    }
    if (space.minY.lt(y)) {
      space.minY = y;
    }
  } else {
    y = y.plus(space.expansionDelta);
    if (y.gt(UINT32_MAX)) {
      y = UINT32_MAX;
    }
    if (space.maxY.lt(y)) {
      space.maxY = y;
    }
  }
  space.save();
}

function getOrCreatePlanet(id: string): Planet {
  let entity = Planet.load(id);
  if (entity != null) {
    return entity as Planet;
  }
  entity = new Planet(id);
  entity.firstAcquired = ZERO;
  entity.active = false;
  entity.numSpaceships = ZERO;
  entity.travelingUpkeep = ZERO; // TODO ?
  entity.overflow = ZERO;
  entity.lastUpdated = ZERO;
  entity.exitTime = ZERO;
  entity.lastAcquired = ZERO;
  entity.reward = ZERO;
  entity.rewardGiver = '';
  entity.stakeDeposited = ZERO;
  entity.owner = '';
  entity.flagTime = ZERO;

  let yString = id.slice(0, 34);
  let xString = '0x' + id.slice(34);

  let x = c2(xString);
  let absX = x.abs();
  let signX = x.lt(BigInt.fromI32(-32)) ? BigInt.fromI32(-1) : BigInt.fromI32(1);
  // log.error('(x,y): ({},{})', [xString, yString]);
  let centerZoneX = absX.plus(BigInt.fromI32(32)).div(BigInt.fromI32(64));
  let centerZoneXString = signX.equals(BigInt.fromI32(1))
    ? centerZoneX.toHex().slice(2).padStart(32, '0')
    : flipHex('0x' + centerZoneX.minus(BigInt.fromI32(1)).toHexString().slice(2).padStart(32, '0')).slice(2);

  let y = c2(yString);
  let absY = y.abs();
  let signY = y.lt(BigInt.fromI32(-32)) ? BigInt.fromI32(-1) : BigInt.fromI32(1);
  let centerZoneY = absY.plus(BigInt.fromI32(32)).div(BigInt.fromI32(64));
  let centerZoneYString = signY.equals(BigInt.fromI32(1))
    ? centerZoneY.toHex().slice(2).padStart(32, '0')
    : flipHex('0x' + centerZoneY.minus(BigInt.fromI32(1)).toHex().slice(2).padStart(32, '0')).slice(2);
  entity.zone = '0x' + centerZoneYString + centerZoneXString;

  // TODO remove :
  entity.x = x;
  entity.y = y;
  entity.zoneX = signX.equals(BigInt.fromI32(1)) ? centerZoneX : centerZoneX.neg();
  entity.zoneY = signY.equals(BigInt.fromI32(1)) ? centerZoneY : centerZoneY.neg();

  // log.error('zone: {}', [entity.zone]);

  // entity.zone =
  //   BigInt.fromI32(-2).toHex() +
  //   '|||' +
  //   BigInt.fromI32(-1).toHex() +
  //   '|||' +
  //   '0x' +
  //   centerZoneX.toHexString().slice(2).padStart(32, '0') +
  //   centerZoneY.toHexString().slice(2).padStart(32, '0');
  return entity as Planet;
}

export function handleInitialized(event: Initialized): void {
  updateChainAndReturnTransactionID(event);
  let space = handleSpace();

  space.address = event.address;

  // NOTE : this actually reset, maybe only set if zero ?
  space.minX = event.params.initialSpaceExpansion;
  space.maxX = event.params.initialSpaceExpansion;
  space.minY = event.params.initialSpaceExpansion;
  space.maxY = event.params.initialSpaceExpansion;
  space.expansionDelta = event.params.expansionDelta;

  space.save();
}

export function handlePlanetStake(event: PlanetStake): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let id = toPlanetId(event.params.location);
  // log.error('id: {}', [id]);
  let entity = getOrCreatePlanet(id);
  let owner = handleOwner(event.params.acquirer);
  owner.totalStaked = owner.totalStaked.plus(event.params.stake);
  owner.currentStake = owner.currentStake.plus(event.params.stake);

  // owner.stake_gas = owner.stake_gas.plus(event.transaction.gasLimit); //gasLimit is not gasUsed
  owner.stake_num = owner.stake_num.plus(ONE);
  owner.save();

  entity.owner = owner.id;
  entity.active = true;
  entity.numSpaceships = event.params.numSpaceships;
  entity.travelingUpkeep = event.params.travelingUpkeep;
  entity.overflow = event.params.overflow;
  entity.lastUpdated = event.block.timestamp;
  if (entity.firstAcquired.equals(ZERO)) {
    entity.firstAcquired = event.block.timestamp;
  }
  entity.lastAcquired = event.block.timestamp;
  entity.exitTime = ZERO;
  entity.stakeDeposited = event.params.stake;
  entity.flagTime = ZERO;
  if (event.params.freegift) {
    entity.flagTime = event.block.timestamp;
  }
  entity.save();

  let planetStakeEvent = new PlanetStakeEvent(toEventId(event));
  planetStakeEvent.blockNumber = event.block.number.toI32();
  planetStakeEvent.timestamp = event.block.timestamp;
  planetStakeEvent.transaction = transactionId;
  planetStakeEvent.owner = owner.id;
  planetStakeEvent.planet = entity.id;
  planetStakeEvent.numSpaceships = event.params.numSpaceships;
  planetStakeEvent.travelingUpkeep = event.params.travelingUpkeep;
  planetStakeEvent.overflow = event.params.overflow;
  planetStakeEvent.stake = event.params.stake;
  planetStakeEvent.save();

  handleSpaceChanges(entity);

  let space = handleSpace();
  // space.stake_gas = space.stake_gas.plus(event.transaction.gasLimit); //gasLimit is not gasUsed
  space.stake_num = space.stake_num.plus(ONE);
  space.currentStake = space.currentStake.plus(event.params.stake);
  space.currentStakeMinusExiting = space.currentStakeMinusExiting.plus(event.params.stake);
  space.totalStaked = space.totalStaked.plus(event.params.stake);
  space.numPlanetsStakedOnce = space.numPlanetsStakedOnce.plus(ONE);
  space.numPlanetsStaked = space.numPlanetsStaked.plus(ONE);
  space.numPlanetsStakedMinusExiting = space.numPlanetsStakedMinusExiting.plus(ONE);
  space.save();
}

export function handleFleetSent(event: FleetSent): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let fleetId = toFleetId(event.params.fleet);
  // ---------------- LOG ----------------------------
  let existingFleet = Fleet.load(fleetId);
  if (existingFleet) {
    log.error('fleet already exist: {}', [fleetId]);
  }
  // --------------------------------------------------
  let fleetEntity = new Fleet(fleetId);
  let planetEntity = getOrCreatePlanet(toPlanetId(event.params.from)); // TODO should be created by now, should we error out if not ?
  planetEntity.numSpaceships = event.params.newNumSpaceships;
  planetEntity.travelingUpkeep = event.params.newTravelingUpkeep;
  planetEntity.overflow = event.params.newOverflow;
  planetEntity.lastUpdated = event.block.timestamp;
  planetEntity.save();
  let fleetSender = handleOwner(event.params.fleetSender);
  // sender.sending_gas = sender.sending_gas.plus(event.transaction.gasLimit);//gasLimit is not gasUsed
  fleetSender.sending_num = fleetSender.sending_num.plus(ONE);
  fleetSender.save();

  let fleetOwner = handleOwner(event.params.fleetOwner);
  fleetOwner.save();

  fleetEntity.owner = fleetOwner.id;
  fleetEntity.sender = fleetSender.id;
  fleetEntity.operator = event.transaction.from;
  fleetEntity.launchTime = event.block.timestamp;
  fleetEntity.from = planetEntity.id;
  fleetEntity.quantity = event.params.quantity;
  fleetEntity.resolved = false;
  fleetEntity.sendTransaction = transactionId;
  fleetEntity.save();
  let fleetSentEvent = new FleetSentEvent(toEventId(event));
  fleetSentEvent.blockNumber = event.block.number.toI32();
  fleetSentEvent.timestamp = event.block.timestamp;
  fleetSentEvent.transaction = transactionId;
  fleetSentEvent.owner = fleetOwner.id;
  fleetSentEvent.sender = fleetSender.id;
  fleetSentEvent.operator = event.transaction.from;
  fleetSentEvent.planet = planetEntity.id;
  fleetSentEvent.fleet = fleetId;
  fleetSentEvent.newNumSpaceships = event.params.newNumSpaceships;
  fleetSentEvent.newTravelingUpkeep = event.params.newTravelingUpkeep;
  fleetSentEvent.newOverflow = event.params.newOverflow;
  fleetSentEvent.quantity = event.params.quantity;
  fleetSentEvent.save();

  let space = handleSpace();
  // space.sending_gas = space.sending_gas.plus(event.transaction.gasLimit);//gasLimit is not gasUsed
  space.sending_num = space.sending_num.plus(ONE);
  space.numFleetsLaunched = space.numFleetsLaunched.plus(ONE);
  space.save();
}

export function handleFleetArrived(event: FleetArrived): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let fleetId = toFleetId(event.params.fleet);
  let planetId = toPlanetId(event.params.destination);
  let planetEntity = getOrCreatePlanet(planetId);
  let fleetEntity = Fleet.load(fleetId) as Fleet; // assert it is available by then
  let fleetOwner = handleOwner(event.params.fleetOwner);
  let destinationOwner = handleOwner(event.params.destinationOwner);

  let exitInterupted = false;
  planetEntity.numSpaceships = event.params.data.newNumspaceships;
  planetEntity.travelingUpkeep = event.params.data.newTravelingUpkeep;
  planetEntity.overflow = event.params.data.newOverflow;
  planetEntity.lastUpdated = event.block.timestamp;
  if (event.params.won) {
    if (planetEntity.stakeDeposited.gt(ZERO)) {
      destinationOwner.currentStake = destinationOwner.currentStake.minus(planetEntity.stakeDeposited);
      destinationOwner.save();

      fleetOwner.currentStake = fleetOwner.currentStake.plus(planetEntity.stakeDeposited);
    }

    planetEntity.owner = fleetOwner.id;
    planetEntity.lastAcquired = event.block.timestamp;
    planetEntity.exitTime = ZERO; // disable exit on capture
    let planetExitEventId = planetEntity.currentExit;
    if (planetExitEventId) {
      let planetExitEvent = PlanetExitEvent.load(planetExitEventId) as PlanetExitEvent; // assert it is available by then
      planetExitEvent.complete = true;
      planetExitEvent.interupted = true;
      planetExitEvent.success = false;
      planetExitEvent.save();
      planetEntity.currentExit = null;
      exitInterupted = true;
    }
  }

  // TODO gas counted even if agent or other perform it
  // sender.resolving_gas = sender.resolving_gas.plus(event.transaction.gasLimit);//gasLimit is not gasUsed
  fleetOwner.resolving_num = fleetOwner.resolving_num.plus(ONE);
  fleetOwner.save();

  planetEntity.save();

  let fleet = Fleet.load(fleetId) as Fleet; // assert it is available by then
  fleet.resolved = true;
  fleet.resolveTransaction = transactionId;
  fleet.to = planetEntity.id;
  fleet.destinationOwner = destinationOwner.id;
  fleet.gift = event.params.gift;
  fleet.fleetLoss = event.params.data.fleetLoss;
  fleet.planetLoss = event.params.data.planetLoss;
  fleet.inFlightFleetLoss = event.params.data.inFlightFleetLoss;
  fleet.inFlightPlanetLoss = event.params.data.inFlightPlanetLoss;
  fleet.won = event.params.won;
  fleet.save();

  let fleetArrivedEvent = new FleetArrivedEvent(toEventId(event));
  fleetArrivedEvent.blockNumber = event.block.number.toI32();
  fleetArrivedEvent.timestamp = event.block.timestamp;
  fleetArrivedEvent.transaction = transactionId;
  fleetArrivedEvent.owner = fleetOwner.id;
  fleetArrivedEvent.planet = planetEntity.id;
  fleetArrivedEvent.fleet = fleetId;
  fleetArrivedEvent.destinationOwner = destinationOwner.id;
  fleetArrivedEvent.fleetLoss = event.params.data.fleetLoss;
  fleetArrivedEvent.planetLoss = event.params.data.planetLoss;
  fleetArrivedEvent.inFlightFleetLoss = event.params.data.inFlightFleetLoss;
  fleetArrivedEvent.inFlightPlanetLoss = event.params.data.inFlightPlanetLoss;
  fleetArrivedEvent.won = event.params.won;
  fleetArrivedEvent.gift = event.params.gift;
  fleetArrivedEvent.sender = fleet.sender;
  fleetArrivedEvent.planetActive = planetEntity.active;
  fleetArrivedEvent.operator = fleet.operator;
  fleetArrivedEvent.taxLoss = event.params.data.taxLoss;
  fleetArrivedEvent.numSpaceshipsAtArrival = event.params.data.numSpaceshipsAtArrival;

  // TODO rename newNumspaceships?
  fleetArrivedEvent.newNumspaceships = event.params.data.newNumspaceships;
  fleetArrivedEvent.newTravelingUpkeep = event.params.data.newTravelingUpkeep;
  fleetArrivedEvent.newOverflow = event.params.data.newOverflow;
  fleetArrivedEvent.accumulatedDefenseAdded = event.params.data.accumulatedDefenseAdded;
  fleetArrivedEvent.accumulatedAttackAdded = event.params.data.accumulatedAttackAdded;

  // extra data
  fleetArrivedEvent.from = fleetEntity.from;
  fleetArrivedEvent.quantity = fleetEntity.quantity;
  fleetArrivedEvent.save();

  let space = handleSpace();
  // space.resolving_gas = space.resolving_gas.plus(event.transaction.gasLimit);//gasLimit is not gasUsed
  space.resolving_num = space.resolving_num.plus(ONE);
  space.numFleetsResolved = space.numFleetsResolved.plus(ONE);
  if (exitInterupted) {
    space.currentStakeMinusExiting = space.currentStakeMinusExiting.plus(planetEntity.stakeDeposited);
    space.numPlanetsStakedMinusExiting = space.numPlanetsStakedMinusExiting.plus(ONE);
  }
  space.save();
}

export function handlePlanetTransfer(event: PlanetTransfer): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let planetId = toPlanetId(event.params.location);
  let planetEntity = getOrCreatePlanet(planetId);
  let previousOwner = handleOwner(event.params.previousOwner);
  let newOwner = handleOwner(event.params.newOwner);

  planetEntity.numSpaceships = event.params.newNumspaceships;
  planetEntity.travelingUpkeep = event.params.newTravelingUpkeep;
  planetEntity.overflow = event.params.newOverflow;
  planetEntity.lastUpdated = event.block.timestamp;

  if (planetEntity.stakeDeposited.gt(ZERO)) {
    previousOwner.currentStake = previousOwner.currentStake.minus(planetEntity.stakeDeposited);
    previousOwner.save();

    newOwner.currentStake = newOwner.currentStake.plus(planetEntity.stakeDeposited);
    newOwner.save();
  }

  planetEntity.owner = newOwner.id;
  planetEntity.lastAcquired = event.block.timestamp;
  // NOTE we do not reset exitTime
  planetEntity.save();

  let planetTransferEvent = new PlanetTransferEvent(toEventId(event));
  planetTransferEvent.blockNumber = event.block.number.toI32();
  planetTransferEvent.timestamp = event.block.timestamp;
  planetTransferEvent.transaction = transactionId;
  planetTransferEvent.owner = previousOwner.id;
  planetTransferEvent.planet = planetEntity.id;

  // TODO rename newNumspaceships?
  planetTransferEvent.newNumspaceships = event.params.newNumspaceships;
  planetTransferEvent.newTravelingUpkeep = event.params.newTravelingUpkeep;
  planetTransferEvent.newOverflow = event.params.newOverflow;

  // extra data
  planetTransferEvent.newOwner = newOwner.id;
  planetTransferEvent.save();
}

export function handleTravelingUpkeepRefund(event: TravelingUpkeepRefund): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let fleetId = toFleetId(event.params.fleet);
  let planetId = toPlanetId(event.params.origin);
  let planetEntity = getOrCreatePlanet(planetId);
  let fleetEntity = Fleet.load(fleetId) as Fleet; // assert it is available by then
  let fleetOwner = fleetEntity.owner;

  planetEntity.numSpaceships = event.params.newNumspaceships;
  planetEntity.travelingUpkeep = event.params.newTravelingUpkeep;
  planetEntity.overflow = event.params.newOverflow;
  planetEntity.lastUpdated = event.block.timestamp;

  planetEntity.save();

  let travelingUpkeepRefundEvent = new TravelingUpkeepRefundEvent(toEventId(event));
  travelingUpkeepRefundEvent.blockNumber = event.block.number.toI32();
  travelingUpkeepRefundEvent.timestamp = event.block.timestamp;
  travelingUpkeepRefundEvent.transaction = transactionId;
  travelingUpkeepRefundEvent.owner = fleetOwner;
  travelingUpkeepRefundEvent.planet = planetEntity.id;
  travelingUpkeepRefundEvent.fleet = fleetId;

  // TODO rename newNumspaceships?
  travelingUpkeepRefundEvent.newNumspaceships = event.params.newNumspaceships;
  travelingUpkeepRefundEvent.newTravelingUpkeep = event.params.newTravelingUpkeep;
  travelingUpkeepRefundEvent.newOverflow = event.params.newOverflow;

  travelingUpkeepRefundEvent.save();
}

// TODO remove, use to test a deployment without affecting game play, not sure it is a good idea, due to events, etc,
// was initial just doing store.remove(planetId) but this caused issue with events referring to the planer
export function handlePlanetReset(event: PlanetReset): void {
  let planetId = toPlanetId(event.params.location);
  let planet = Planet.load(planetId);
  if (planet) {
    planet.firstAcquired = ZERO;
    planet.active = false;
    planet.numSpaceships = ZERO;
    planet.travelingUpkeep = ZERO; // TODO ?
    planet.overflow = ZERO;
    planet.lastUpdated = ZERO;
    planet.exitTime = ZERO;
    planet.lastAcquired = ZERO;
    planet.reward = ZERO;
    planet.rewardGiver = '';
    planet.stakeDeposited = ZERO;
    planet.owner = '';
    planet.lastAcquired = ZERO;
    planet.stakeDeposited = ZERO;
    planet.currentExit = null;
    planet.save();
  }
}

export function handleExit(event: PlanetExit): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let owner = handleOwner(event.params.owner);
  // owner.exit_attempt_gas = owner.exit_attempt_gas.plus(event.transaction.gasLimit);//gasLimit is not gasUsed
  owner.exit_attempt_num = owner.exit_attempt_num.plus(ONE);
  owner.save();

  let planetId = toPlanetId(event.params.location);
  let planetEntity = Planet.load(planetId) as Planet; // assert it is available by then
  if (!planetEntity) {
    log.error('planet never acquired: {}', [planetId]); // this should never happen, exit can only happen when acquired
    // will fails as all fields are not set
  }
  planetEntity.exitTime = event.block.timestamp;

  let planetExitEvent = new PlanetExitEvent(toEventId(event));
  planetExitEvent.blockNumber = event.block.number.toI32();
  planetExitEvent.timestamp = event.block.timestamp;
  planetExitEvent.transaction = transactionId;
  planetExitEvent.owner = owner.id;
  planetExitEvent.planet = planetEntity.id;
  planetExitEvent.exitTime = event.block.timestamp;

  // extra data
  planetExitEvent.stake = planetEntity.stakeDeposited as BigInt;
  planetExitEvent.complete = false;
  planetExitEvent.interupted = false;
  planetExitEvent.success = false;
  planetExitEvent.save();

  planetEntity.currentExit = planetExitEvent.id;
  planetEntity.save();

  let space = handleSpace();
  // space.exit_attempt_gas = space.exit_attempt_gas.plus(event.transaction.gasLimit);//gasLimit is not gasUsed
  space.exit_attempt_num = space.exit_attempt_num.plus(ONE);
  space.numPlanetsWithExit = space.numPlanetsWithExit.plus(ONE);
  space.currentStakeMinusExiting = space.currentStakeMinusExiting.minus(planetEntity.stakeDeposited);
  space.numPlanetsStakedMinusExiting = space.numPlanetsStakedMinusExiting.minus(ONE);
  space.save();
}

export function handleExitComplete(event: ExitComplete): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let owner = handleOwner(event.params.owner);
  owner.totalCollected = owner.totalCollected.plus(event.params.stake);
  owner.currentStake = owner.currentStake.minus(event.params.stake);
  owner.save();
  let planetEntity = Planet.load(toPlanetId(event.params.location)) as Planet; // assert it is available by then
  planetEntity.active = false;
  planetEntity.stakeDeposited = ZERO;
  planetEntity.owner = '';

  let planetExitEventId = planetEntity.currentExit;
  if (planetExitEventId) {
    let planetExitEvent = PlanetExitEvent.load(planetExitEventId) as PlanetExitEvent; // assert it is available by then
    planetExitEvent.complete = true;
    planetExitEvent.success = true;
    planetExitEvent.interupted = false;
    planetExitEvent.save();
  }

  planetEntity.currentExit = null;
  planetEntity.save();

  let exitCompleteEvent = new ExitCompleteEvent(toEventId(event));
  exitCompleteEvent.blockNumber = event.block.number.toI32();
  exitCompleteEvent.timestamp = event.block.timestamp;
  exitCompleteEvent.transaction = transactionId;
  exitCompleteEvent.owner = owner.id;
  exitCompleteEvent.planet = planetEntity.id;
  exitCompleteEvent.stake = event.params.stake;
  exitCompleteEvent.save();

  let space = handleSpace();
  space.numPlanetsWithExit = space.numPlanetsWithExit.minus(ONE);
  space.numPlanetsExitFinalized = space.numPlanetsExitFinalized.plus(ONE);
  space.currentStake = space.currentStake.minus(planetEntity.stakeDeposited);
  space.numPlanetsStaked = space.numPlanetsStaked.minus(ONE);
  space.save();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function handleStakeToWithdraw(event: StakeToWithdraw): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let owner = handleOwner(event.params.owner);
  owner.tokenToWithdraw = event.params.newStake;
  owner.save();

  let stakeToWithdrawEvent = new StakeToWithdrawEvent(toEventId(event));
  stakeToWithdrawEvent.blockNumber = event.block.number.toI32();
  stakeToWithdrawEvent.timestamp = event.block.timestamp;
  stakeToWithdrawEvent.transaction = transactionId;
  stakeToWithdrawEvent.owner = owner.id;
  stakeToWithdrawEvent.newStake = event.params.newStake;
  stakeToWithdrawEvent.save();
}

export function handleRewardSetup(event: RewardSetup): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let planetId = toPlanetId(event.params.location);
  let planetEntity = getOrCreatePlanet(planetId);
  planetEntity.reward = event.params.rewardId;
  planetEntity.rewardGiver = event.params.giver.toHexString();
  planetEntity.save();

  let rewardSetupEvent = new RewardSetupEvent(toEventId(event));
  rewardSetupEvent.blockNumber = event.block.number.toI32();
  rewardSetupEvent.timestamp = event.block.timestamp;
  rewardSetupEvent.transaction = transactionId;
  rewardSetupEvent.planet = planetEntity.id;
  rewardSetupEvent.giver = event.params.giver.toHexString();
  rewardSetupEvent.rewardId = event.params.rewardId;
  rewardSetupEvent.save();
}

export function handleRewardToWithdraw(event: RewardToWithdraw): void {
  let transactionId = updateChainAndReturnTransactionID(event);
  let planetEntity = Planet.load(toPlanetId(event.params.location)) as Planet; // assert it is available by then
  planetEntity.reward = ZERO;
  planetEntity.rewardGiver = '';
  planetEntity.save();

  let owner = handleOwner(event.params.owner);

  handleReward(event.params.rewardId, owner.id, planetEntity.id);

  let rewardToWithdrawEvent = new RewardToWithdrawEvent(toEventId(event));
  rewardToWithdrawEvent.blockNumber = event.block.number.toI32();
  rewardToWithdrawEvent.timestamp = event.block.timestamp;
  rewardToWithdrawEvent.transaction = transactionId;
  rewardToWithdrawEvent.planet = planetEntity.id;
  rewardToWithdrawEvent.owner = owner.id;
  rewardToWithdrawEvent.rewardId = event.params.rewardId;
  rewardToWithdrawEvent.save();
}
