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
  const {execute, read} = hre.deployments;

  if (networkName === 'defcon' || networkName === 'beta') {
    if (hre.network.name !== 'hardhat') {
      console.log(`you got 5 seconds to cancel`);
      await wait(5);

      // console.error(`remove this to proceed. You won't be able to revert.`);
      // process.exit();
    }
  }

  async function blockIfNotBlocked(name: string) {
    const owner = await read(name, 'owner');
    if (owner.toLowerCase() !== zeroAddress.toLowerCase()) {
      await execute(name, {from: deployer, log: true}, 'transferOwnership', zeroAddress);
    }
  }
  await blockIfNotBlocked('AllianceRegistry');
  await blockIfNotBlocked('FreePlayToken');
  await blockIfNotBlocked('OuterSpace');
  await blockIfNotBlocked('PlayToken');
};
export default func;
func.tags = ['INIT'];
