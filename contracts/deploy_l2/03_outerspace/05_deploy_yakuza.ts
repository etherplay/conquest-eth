import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from '@ethersproject/units';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const OuterSpace = await hre.deployments.get('OuterSpace');
  const PlayToken = await hre.deployments.get('PlayToken');
  const RewardsGenerator = await hre.deployments.get('RewardsGenerator');

  const config = {
    genesis: OuterSpace.linkedData.genesisHash,
    acquireNumSpaceships: OuterSpace.linkedData.acquireNumSpaceships,
    productionCapAsDuration: OuterSpace.linkedData.productionCapAsDuration,
    frontrunningDelay: OuterSpace.linkedData.frontrunningDelay,

    numSecondsPerTokens: 216000, // 12$ gives you 30 days
    spaceshipsToKeepPer10000: 2000, // 20% of cap to keep
    minAverageStakePerPlanet: parseEther('5').toString(), // 5 tokens per planet on average minimum, do mot accept low planet unless bigger are given too
    maxClaimDelay: 2 * 24 * 60 * 60, // 2 days
    minimumSubscriptionWhenStaking: parseEther('1'),
  };

  console.log(config);
  await deploy('Yakuza', {
    from: deployer,
    args: [deployer, RewardsGenerator.address, OuterSpace.address, PlayToken.address, config],
    proxy: hre.network.name !== 'mainnet' ? 'postUpgrade' : undefined, // TODO l2 network mainnet
    linkedData: config,
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['Yakuza', 'Yakuza_deploy'];
func.dependencies = ['RewardsGenerator_deploy'];
