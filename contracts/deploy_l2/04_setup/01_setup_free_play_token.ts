import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {deployments} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer, claimKeyDistributor} = await hre.getNamedAccounts();
  const {read, execute} = hre.deployments;

  const OuterSpaceDeployment = await deployments.get('OuterSpace');

  const isMinter = await read('FreePlayToken', 'minters', deployer);
  if (!isMinter) {
    await execute('FreePlayToken', {from: deployer, log: true, autoMine: true}, 'setMinter', deployer, true);
  }

  // const isBurner = await read('FreePlayToken', 'burners', OuterSpaceDeployment.address);
  // if (!isBurner) {
  //   await execute(
  //     'FreePlayToken',
  //     {from: deployer, log: true, autoMine: true},
  //     'setBurner',
  //     OuterSpaceDeployment.address,
  //     true
  //   );
  // }
};
export default func;
func.tags = ['FreePlayToken', 'FreePlayToken_setup'];
func.dependencies = ['FreePlayToken_deploy'];
