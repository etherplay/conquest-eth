import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import fs from 'fs';
import {BigNumber} from 'ethers';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read} = hre.deployments;

  const keys = JSON.parse(fs.readFileSync('./.alpha.claimKeys').toString());

  for (const key of keys) {
    const amount = await read('ConquestToken', 'balanceOf', key.address);
    if (!amount.eq(BigNumber.from(key.amount).mul('1000000000000000000'))) {
      console.log({address: key.address});
    }
  }
}
if (require.main === module) {
  func(hre);
}
