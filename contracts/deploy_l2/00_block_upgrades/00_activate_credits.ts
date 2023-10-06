import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {zeroAddress} from '../../test/test-utils';
import {formatEther} from '@ethersproject/units';

function wait(s: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const networkName = await hre.deployments.getNetworkName();
  const {playerAccount3, deployer} = await hre.getNamedAccounts();
  const {execute, read, get} = hre.deployments;

  // if (networkName === 'defcon' || networkName === 'beta') {
  //   if (hre.network.name !== 'hardhat') {
  //     console.log(`CREDITS ACTIVATION: you got 5 seconds to cancel`);
  //     await wait(5);

  //     console.error(`remove this to proceed. You won't be able to revert.`);
  //     process.exit();
  //   }
  // }

  // const RewardsGenerator = await get('RewardsGenerator');

  // await execute('ConquestCredits', {from: deployer, log: true}, 'setGenerator', RewardsGenerator.address, true);

  // if (hre.network.name === 'hardhat') {
  //   {
  //     const balance = await read('ConquestCredits', 'balanceOf', playerAccount3);
  //     console.log(`num Credits: ${formatEther(balance)}`);
  //   }
  //   await execute('RewardsGenerator', {from: playerAccount3, log: true}, 'claimSharedPoolRewards', playerAccount3);

  //   {
  //     const balance = await read('ConquestCredits', 'balanceOf', playerAccount3);
  //     console.log(`num Credits: ${formatEther(balance)}`);
  //   }
  // }
};
export default func;
func.tags = ['INIT'];
