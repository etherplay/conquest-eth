import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const RewardsGenerator = await hre.deployments.get('RewardsGenerator');

  await deploy('BrainLess', {
    from: deployer,
    skipIfAlreadyDeployed: true,
    args: [deployer, RewardsGenerator.address],
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['BrainLess', 'BrainLess_deploy'];
func.dependencies = ['RewardsGenerator_deploy'];
