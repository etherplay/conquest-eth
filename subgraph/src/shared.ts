/* eslint-disable */
import {Address, ethereum, BigInt} from '@graphprotocol/graph-ts';
import {flipHex, c2, ZERO, toOwnerId} from './utils';
import {Owner, Chain, Transaction, Space, Planet} from '../generated/schema';
import {VERSION} from '../config';

export function handleSpace(): Space {
  let space = Space.load('Space');
  if (space == null) {
    space = new Space('Space');
    space.minX = ZERO;
    space.maxX = ZERO;
    space.minY = ZERO;
    space.maxY = ZERO;
    space.expansionDelta = ZERO;

    space.stake_gas = ZERO;
    space.stake_num = ZERO;

    space.sending_gas = ZERO;
    space.sending_num = ZERO;

    space.resolving_gas = ZERO;
    space.resolving_num = ZERO;

    space.exit_attempt_gas = ZERO;
    space.exit_attempt_num = ZERO;

    space.totalStaked = ZERO;
    space.currentStake = ZERO;
    space.currentStakeMinusExiting = ZERO;
    space.numPlanetsStakedMinusExiting = ZERO;

    space.numPlanetsStaked = ZERO;
    space.numPlanetsStakedOnce = ZERO;

    space.numFleetsLaunched = ZERO;
    space.numFleetsResolved = ZERO;

    space.numPlanetsExitFinalized = ZERO;
    space.numPlanetsWithExit = ZERO;
    // space.totalCollected = ZERO;
    // space.playTokenInCirculation = ZERO;
    // space.playTokenInGame = ZERO;
    // space.freePlayTokenInCirculation = ZERO;
    // space.feeePlayTokenInGame = ZERO;

    // space.tokenToWithdraw = ZERO;

    space.save();
  }
  return space as Space;
}

export function handleOwnerViaId(id: string): Owner {
  let entity = Owner.load(id);
  if (entity) {
    return entity as Owner;
  }
  entity = new Owner(id);
  entity.totalStaked = ZERO;
  entity.currentStake = ZERO;
  entity.totalCollected = ZERO;
  entity.tokenToWithdraw = ZERO;
  entity.playTokenBalance = ZERO;
  entity.freePlayTokenBalance = ZERO;
  entity.freePlayTokenClaimBalance = ZERO;
  entity.points = ZERO;
  entity.points_shared_totalRewardPerPointAccounted = ZERO;
  entity.points_shared_rewardsToWithdraw = ZERO;
  entity.points_fixed_toWithdraw = ZERO;
  entity.points_fixed_lastTime = ZERO;

  // entity.stake_gas = ZERO;
  entity.stake_num = ZERO;

  // entity.sending_gas = ZERO;
  entity.sending_num = ZERO;

  // entity.resolving_gas = ZERO;
  entity.resolving_num = ZERO;

  // entity.exit_attempt_gas = ZERO;
  entity.exit_attempt_num = ZERO;

  entity.save();
  return entity as Owner;
}

export function handleOwner(address: Address): Owner {
  let id = toOwnerId(address);
  return handleOwnerViaId(id);
}

export function updateChainAndReturnTransactionID(event: ethereum.Event): string {
  let chain = Chain.load('Chain');
  if (chain == null) {
    chain = new Chain('Chain');
    chain.v = VERSION;
  }
  chain.blockHash = event.block.hash.toHex();
  chain.blockNumber = event.block.number;
  chain.save();

  let transactionId = event.transaction.hash.toHex();
  let transaction = Transaction.load(transactionId);
  if (transaction == null) {
    transaction = new Transaction(transactionId);
    transaction.save();
  }

  return transactionId;
}

export function getOrCreatePlanet(id: string): Planet {
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
