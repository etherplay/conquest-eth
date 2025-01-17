import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const OuterSpace = await hre.deployments.get('OuterSpace');

  await deploy('BasicSpaceshipMarket', {
    from: deployer,
    proxy: true, // TODO remove
    args: [OuterSpace.address],
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['BasicSpaceshipMarket'];
