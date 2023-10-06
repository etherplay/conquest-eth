import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {BigNumber} from 'ethers';
import {formatEther} from '@ethersproject/units';

const args = process.argv.slice(2);

if (args.length !== 2) {
  throw new Error(`<name> <account>`);
}
const deploymentName = args[0];
const address = args[1];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read} = hre.deployments;
  const value = await read(deploymentName, 'balanceOf', address);
  console.log(formatEther(value));
}
if (require.main === module) {
  func(hre);
}
