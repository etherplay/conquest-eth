import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {formatEther} from '@ethersproject/units';

const args = process.argv.slice(2);
const account = args[0];

function format(v: any): string {
  if (v._isBigNumber) {
    return v.toString();
  }
  const obj: any = {};
  for (const key of Object.keys(v)) {
    obj[key] = v[key];
    if (obj[key]._isBigNumber) {
      obj[key] = obj[key].toString();
    }
  }

  return JSON.stringify(obj, null, 2);
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read} = hre.deployments;
  const fixed_score = await read('RewardsGenerator', 'earnedFromFixedRate', account);
  const pool_score = await read('RewardsGenerator', 'earnedFromPoolRate', account);
  console.log({fixed_score: formatEther(fixed_score), pool_score: formatEther(pool_score)});

  try {
    const global = await read('RewardsGenerator', '_global');
    console.log(`------------------------- global -----------------------------------`);
    console.log(format(global));
    console.log(`------------------------- ------ -----------------------------------`);
  } catch {}

  try {
    const _sharedRateRewardPerAccount = await read('RewardsGenerator', '_sharedRateRewardPerAccount', account);
    console.log(`------------------------- _sharedRateRewardPerAccount -----------------------------------`);
    console.log(format(_sharedRateRewardPerAccount));
    console.log(`------------------------- ------ -----------------------------------`);
  } catch {}

  try {
    const _fixedRateRewardPerAccount = await read('RewardsGenerator', '_fixedRateRewardPerAccount', account);
    console.log(`------------------------- _fixedRateRewardPerAccount -----------------------------------`);
    console.log(format(_fixedRateRewardPerAccount));
    console.log(`------------------------- ------ -----------------------------------`);
  } catch {}
}
if (require.main === module) {
  func(hre);
}
