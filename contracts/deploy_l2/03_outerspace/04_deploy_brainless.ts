import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;

    const RewardsGenerator = env.get('RewardsGenerator');

    await env.deploy('BrainLess', {
      account: deployer as `0x${string}`,
      artifact: artifacts.BrainLess,
      args: [deployer, RewardsGenerator.address],
    });
  },
  {
    tags: ['BrainLess', 'BrainLess_deploy'],
    dependencies: ['RewardsGenerator_deploy'],
  },
);