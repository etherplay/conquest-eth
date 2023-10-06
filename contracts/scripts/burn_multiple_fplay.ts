import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
const list = [
  {
    from: '0x23bc95F84BD43C1FCc2bc285fDa4Cb12f9AEE2df',
    amount: '7900000000000000000',
  },
];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {execute, read, get} = hre.deployments;
  const {deployer} = await hre.getNamedAccounts();
  const OuterSpace = await get('OuterSpace');

  await execute('FreePlayToken', {from: deployer, log: true}, 'setBurner', deployer, true);

  const amountInOuterspaceBefore = await read('FreePlayToken', 'balanceOf', OuterSpace.address);
  const amountInDeployerBefore = await read('PlayToken', 'balanceOf', deployer);
  await execute('FreePlayToken', {from: deployer, log: true}, 'burnMultiple', list, deployer);

  await execute('FreePlayToken', {from: deployer, log: true}, 'setBurner', deployer, false);

  const amountInOuterspaceAfter = await read('FreePlayToken', 'balanceOf', OuterSpace.address);
  const amountInDeployerAfter = await read('PlayToken', 'balanceOf', deployer);

  console.log({
    amountInDeployerBefore: amountInDeployerBefore.toString(),
    amountInDeployerAfter: amountInDeployerAfter.toString(),
    amountInOuterspaceBefore: amountInOuterspaceBefore.toString(),
    amountInOuterspaceAfter: amountInOuterspaceAfter.toString(),
  });
}
if (require.main === module) {
  func(hre);
}
