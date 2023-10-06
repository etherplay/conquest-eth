import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  await deploy('AllianceRegistry', {
    from: deployer,
    proxy: hre.network.name !== 'mainnet' ? true : undefined,
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['AllianceRegistry', 'AllianceRegistry_deploy'];
