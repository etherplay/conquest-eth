import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {zeroAddress} from '../../test/test-utils';

function wait(s: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const networkName = await hre.deployments.getNetworkName();
  const {deployer} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;

  if (networkName === 'defcon' || networkName === 'beta') {
    if (hre.network.name !== 'hardhat') {
      console.log(`you got 5 seconds to cancel`);
      await wait(5);

      console.error(`remove this to proceed. You won't be able to revert.`);
      process.exit();
    }
  }

  await execute('AllianceRegistry', {from: deployer, log: true}, 'transferOwnership', zeroAddress);
  await execute('FreePlayToken', {from: deployer, log: true}, 'transferOwnership', zeroAddress);
  await execute('OuterSpace', {from: deployer, log: true}, 'transferOwnership', zeroAddress);
  await execute('PlayToken', {from: deployer, log: true}, 'transferOwnership', zeroAddress);
};
export default func;
func.tags = ['INIT'];
