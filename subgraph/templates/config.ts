/* eslint-disable */
import {BigInt} from '@graphprotocol/graph-ts';

export let REWARD_RATE_millionth = BigInt.fromU32({{contracts.RewardsGenerator.linkedData.rewardRateMillionth}});
export let FIXED_REWARD_RATE_thousands_millionth = BigInt.fromU32({{contracts.RewardsGenerator.linkedData.fixedRewardRateThousandsMillionth}});
export let VERSION = "{{commitHash}}";