/* eslint-disable */
import {Address, ethereum} from '@graphprotocol/graph-ts';
import {ZERO, toOwnerId} from './utils';
import {Owner, Chain, Transaction, Space} from '../generated/schema';
import {VERSION} from './config';

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
