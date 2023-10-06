import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  await deploy('ConquestCredits', {
    from: deployer,
    args: [deployer],
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['ConquestCredits', 'ConquestCredits_deploy'];
