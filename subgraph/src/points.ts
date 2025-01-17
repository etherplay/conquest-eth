/* eslint-disable */
import {BigInt} from '@graphprotocol/graph-ts';
import {ZERO_ADDRESS, ZERO} from './utils';
import {Transfer} from '../generated/PlayToken/PlayToken_Contract';
import {handleOwner, updateChainAndReturnTransactionID} from './shared';
import {Owner, Points} from '../generated/schema';

let DECIMALS_9: BigInt = BigInt.fromString('1000000000');
let DECIMALS_18_MILLIONTH: BigInt = BigInt.fromString('1000000000000');
let PRECISION: BigInt = BigInt.fromString('1000000000000000000000000');
let REWARD_RATE_millionth = BigInt.fromU32(100); // TODO CONFIG
let FIXED_REWARD_RATE_thousands_millionth = BigInt.fromU32(10); // TODO CONFIG

function _computeRewardsEarned(
  totalRewardPerPointAccountedSoFar: BigInt,
  accountPoints: BigInt,
  currentTotalRewardPerPoint: BigInt,
  accountRewardsSoFar: BigInt
): BigInt {
  return accountRewardsSoFar.plus(
    accountPoints
      .times(currentTotalRewardPerPoint.minus(totalRewardPerPointAccountedSoFar))
      .times(DECIMALS_18_MILLIONTH)
      .div(PRECISION)
  );
}

function _computeExtraTotalRewardPerPointSinceLastTime(
  totalPoints: BigInt,
  rewardRateMillionth: BigInt,
  lastUpdateTime: BigInt,
  event: Transfer
): BigInt {
  if (totalPoints == ZERO) {
    return ZERO;
  }
  let timestamp: BigInt = event.block.timestamp;
  let delta: BigInt = timestamp.minus(lastUpdateTime);
  return delta.times(rewardRateMillionth.times(PRECISION)).div(totalPoints);
}

export function handleGeneratorPointsTransfer(event: Transfer): void {
  updateChainAndReturnTransactionID(event);

  let owner: Owner;
  let addition = false;
  if (event.params.from.equals(ZERO_ADDRESS)) {
    owner = handleOwner(event.params.to);
    addition = true;
  } else if (event.params.to.equals(ZERO_ADDRESS)) {
    owner = handleOwner(event.params.from);
    addition = false;
  } else {
    return;
  }

  let _global = Points.load('Points');
  if (_global == null) {
    _global = new Points('Points');
    _global.lastUpdateTime = ZERO;
    _global.totalRewardPerPointAtLastUpdate = ZERO;
    _global.totalPoints = ZERO;
  }

  // -----------------------------------------------------------------------------------------------------------
  // GLOBAL
  // -----------------------------------------------------------------------------------------------------------

  let totalPointsSoFar = _global.totalPoints;

  let extraTotalRewardPerPoint = _computeExtraTotalRewardPerPointSinceLastTime(
    totalPointsSoFar,
    REWARD_RATE_millionth,
    _global.lastUpdateTime,
    event
  );

  let totalRewardPerPointAllocatedSoFar = _global.totalRewardPerPointAtLastUpdate.plus(extraTotalRewardPerPoint);

  _global.totalRewardPerPointAtLastUpdate = totalRewardPerPointAllocatedSoFar;
  _global.lastUpdateTime = event.block.timestamp;

  if (addition) {
    _global.totalPoints = totalPointsSoFar.plus(event.params.value);
  } else {
    _global.totalPoints = totalPointsSoFar.minus(event.params.value);
  }

  _global.save();
  // -----------------------------------------------------------------------------------------------------------

  // -----------------------------------------------------------------------------------------------------------
  // PER ACCOUNT
  // -----------------------------------------------------------------------------------------------------------
  let accountPointsSoFar = owner.points;

  // update the reward that can be withdrawn, catching up account state to global
  owner.points_shared_rewardsToWithdraw = _computeRewardsEarned(
    // last checkpoint : when was the account last updated
    owner.points_shared_totalRewardPerPointAccounted,
    accountPointsSoFar,
    totalRewardPerPointAllocatedSoFar,
    // rewards already registered
    owner.points_shared_rewardsToWithdraw
  );
  owner.points_shared_totalRewardPerPointAccounted = totalRewardPerPointAllocatedSoFar;

  let extraFixed = event.block.timestamp
    .minus(owner.points_fixed_lastTime)
    .times(accountPointsSoFar.times(FIXED_REWARD_RATE_thousands_millionth))
    .div(DECIMALS_9);
  owner.points_fixed_lastTime = event.block.timestamp;
  owner.points_fixed_toWithdraw = owner.points_fixed_toWithdraw.plus(extraFixed);

  if (addition) {
    owner.points = accountPointsSoFar.plus(event.params.value);
  } else {
    owner.points = accountPointsSoFar.minus(event.params.value);
  }

  owner.save();
}
