import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from '@ethersproject/units';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const OuterSpace = await hre.deployments.get('OuterSpace');
  const RewardsGenerator = await hre.deployments.get('RewardsGenerator');

  const config = {
    numSecondsPer1000ThOfATokens: 216, // 12$ gives you 30 days
    spaceshipsToKeepPer10000: 2000, // 20% of cap to keep
    acquireNumSpaceships: OuterSpace.linkedData.acquireNumSpaceships,
    productionCapAsDuration: OuterSpace.linkedData.productionCapAsDuration,
    minAverageStakePerPlanet: parseEther('5'), // 5 tokens per planet on average minimum, do mot accept low planet unless bigger are given too
    maxClaimDelay: 2 * 24 * 60 * 60, // 2 days
  };
  await deploy('Yakuza', {
    from: deployer,
    skipIfAlreadyDeployed: true,
    args: [deployer, RewardsGenerator.address, OuterSpace.address, config],
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['Yakuza', 'Yakuza_deploy'];
func.dependencies = ['RewardsGenerator_deploy'];
