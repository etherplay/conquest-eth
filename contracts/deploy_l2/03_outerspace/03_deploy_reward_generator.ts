import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {formatEther, parseEther} from 'viem';

import {increaseTime} from '../../test/test-utils.js';

export default deployScript(
  async (env) => {
    const networkName = await env.getNetworkName();
    const {deployer, player} = env.namedAccounts;

    const ConquestCredits = env.get('ConquestCredits');
    const OuterSpace = env.get('OuterSpace');
    const gamesToEnable = [OuterSpace.address];

    const accountsToInitialise: {account: `0x${string}`; amount: string}[] = [];

    // Disabled first
    let rewardRateMillionth = 0;
    let fixedRewardRateThousandsMillionth = 0;

    if (networkName === 'localhost') {
      // will be upgraded with these parameters:
      // rewardRateMillionth = 100; // 100 for every million of second. or 8.64 / day
      // fixedRewardRateThousandsMillionth = 10; // 10 for every  thousand million of seconds, or 0.000864 per day per stake or 315.36 / year / 1000 stake
    }

    if (networkName === '2025_1') {
      // will be upgraded with these parameters:
      rewardRateMillionth = 100; // 100 for every million of second. or 8.64 / day
      fixedRewardRateThousandsMillionth = 10; // 10 for every  thousand million of seconds, or 0.000864 per day per stake or 315.36 / year / 1000 stake
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const ExistingRewardsGenerator = await env.getOrNull('RewardsGenerator');
    if (ExistingRewardsGenerator) {
      const existing_rewardRateMillionth = await env.read(ExistingRewardsGenerator, {
        functionName: 'REWARD_RATE_millionth',
        args: [],
      });
      const existing_fixedRewardRateThousandsMillionth = await env.read(
        ExistingRewardsGenerator,
        {
          functionName: 'FIXED_REWARD_RATE_thousands_millionth',
          args: [],
        }
      );

      if (
        !existing_fixedRewardRateThousandsMillionth.eq(fixedRewardRateThousandsMillionth) ||
        !existing_rewardRateMillionth.eq(rewardRateMillionth)
      ) {
        if (existing_fixedRewardRateThousandsMillionth.eq(0) && existing_rewardRateMillionth.eq(0)) {
          console.log(`RewardsGenerator parameters changed, updating`);
          const lastUpdate = await env.read(ExistingRewardsGenerator, {
            functionName: 'lastUpdated',
            args: [],
          });
          if (timestamp - Number(lastUpdate) > 1 * 60) {
            await env.execute(ExistingRewardsGenerator, {
              account: deployer as `0x${string}`,
              functionName: 'update',
              args: [],
            });
          }
        } else {
          console.log(`do not update as it is non-zero`);
        }
      }
    }

    const RewardsGenerator = await env.deployViaProxy(
      'RewardsGenerator',
      {
        account: deployer as `0x${string}`,
        artifact: artifacts.RewardsGenerator,
        args: [
          ConquestCredits.address,
          {
            rewardRateMillionth,
            fixedRewardRateThousandsMillionth,
          },
          gamesToEnable,
          accountsToInitialise,
        ],
      },
      {
        proxyDisabled: false,
        execute: 'postUpgrade',
      },
    );

    const currentGeneratorAdmin = await env.read(OuterSpace, {
      functionName: 'generatorAdmin',
      args: [],
    });
    if (currentGeneratorAdmin.toLowerCase() !== (deployer as string).toLowerCase()) {
      await env.execute(OuterSpace, {
        account: deployer as `0x${string}`,
        functionName: 'setGeneratorAdmin',
        args: [deployer],
      });
    }

    const currentGenerator = await env.read(OuterSpace, {
      functionName: 'generator',
      args: [],
    });
    if (currentGenerator.toLowerCase() !== RewardsGenerator.address.toLowerCase()) {
      await env.execute(OuterSpace, {
        account: deployer as `0x${string}`,
        functionName: 'setGenerator',
        args: [RewardsGenerator.address],
      });
    }
  },
  {
    tags: ['RewardsGenerator', 'RewardsGenerator_deploy'],
    dependencies: ['ConquestCredits_deploy', 'OuterSpace_deploy'],
  },
);