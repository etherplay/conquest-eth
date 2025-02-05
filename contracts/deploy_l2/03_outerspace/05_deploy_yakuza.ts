import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from '@ethersproject/units';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;

  const OuterSpace = await hre.deployments.get('OuterSpace');
  const PlayToken = await hre.deployments.get('PlayToken');
  const RewardsGenerator = await hre.deployments.get('RewardsGenerator');

  //const numSecondsPerTokens = 259200; // 12$ gives you 36 days
  const numSecondsPerTokens = 302400; // 2$ gives you 1 week
  const config = {
    genesis: OuterSpace.linkedData.genesisHash,
    acquireNumSpaceships: OuterSpace.linkedData.acquireNumSpaceships,
    productionCapAsDuration: OuterSpace.linkedData.productionCapAsDuration,
    frontrunningDelay: OuterSpace.linkedData.frontrunningDelay,
    timePerDistance: OuterSpace.linkedData.timePerDistance,
    productionSpeedUp: OuterSpace.linkedData.productionSpeedUp,

    minAttackAmount: 50000,
    numSecondsPerTokens,
    spaceshipsToKeepPer10000: 2000, // 20% of cap to keep
    minAverageStakePerPlanet: parseEther('5').toString(), // 5 tokens per planet on average minimum, do mot accept low planet unless bigger are given too
    maxClaimDelay: Math.floor((1 * 24 * 60 * 60) / OuterSpace.linkedData.productionSpeedUp), // 1 day
    minimumSubscriptionWhenNotStaking: parseEther('1').toString(),
    minimumSubscriptionWhenStaking: parseEther('1').toString(),
    attackMaxDistance: 64,
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
