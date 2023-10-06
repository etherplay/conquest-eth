import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {BigNumber} from 'ethers';
import {formatEther} from '@ethersproject/units';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read, get} = hre.deployments;
  const PlayToken = await get('PlayToken');
  const value = await read('SDAI', 'maxWithdraw', PlayToken.address);
  console.log(formatEther(value));
}
if (require.main === module) {
  func(hre);
}
