import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {parseEther} from 'viem';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;

    const OuterSpace = env.get('OuterSpace');
    const PlayToken = env.get('PlayToken');
    const RewardsGenerator = env.get('RewardsGenerator');

    //const numSecondsPerTokens = 259200; // 12$ gives you 36 days
    const numSecondsPerTokens = 302400; // 2$ gives you 1 week
    const config = {
      genesis: OuterSpace.linkedData.genesisHash,
      acquireNumSpaceships: OuterSpace.linkedData.acquireNumSpaceships,
      productionCapAsDuration: OuterSpace.linkedData.productionCapAsDuration,
      frontrunningDelay: OuterSpace.linkedData.frontrunningDelay,
      timePerDistance: OuterSpace.linkedData.timePerDistance,
      productionSpeedUp: OuterSpace.linkedData.productionSpeedUp,

      minAttackAmount: 20000,
      numSecondsPerTokens,
      spaceshipsToKeepPer10000: 1500, // 15% of cap to keep
      minAverageStakePerPlanet: parseEther('1').toString(), // 1 tokens per planet on average minimum, do mot accept low planet unless bigger are given too
      maxClaimDelay: Math.floor((1 * 24 * 60 * 60) / OuterSpace.linkedData.productionSpeedUp), // 1 day
      minimumSubscriptionWhenNotStaking: parseEther('1').toString(),
      minimumSubscriptionWhenStaking: parseEther('1').toString(),
      maxTimeRange: Math.floor((5 * 24 * 60 * 60) / OuterSpace.linkedData.productionSpeedUp), // 5 days
    };

    console.log(config);
    await env.deployViaProxy(
      'Yakuza',
      {
        account: deployer as `0x${string}`,
        artifact: artifacts.Yakuza,
        args: [deployer, RewardsGenerator.address, OuterSpace.address, PlayToken.address, config],
      },
      {
        proxyDisabled: false,
        execute: 'postUpgrade',
      },
    );
  },
  {
    tags: ['Yakuza', 'Yakuza_deploy'],
    dependencies: ['RewardsGenerator_deploy'],
  },
);