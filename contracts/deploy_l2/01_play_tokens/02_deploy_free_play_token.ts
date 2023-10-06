import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {deployments} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const PlayToken = await deployments.get('PlayToken');

  await deploy('FreePlayToken', {
    from: deployer,
    contract: 'FreePlayToken',
    args: [PlayToken.address, deployer],
    proxy: hre.network.name !== 'mainnet' ? 'postUpgrade' : undefined, // TODO l2 network mainnet
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['FreePlayToken', 'FreePlayToken_deploy'];
func.dependencies = ['PlayToken_deploy'];
