import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;

    const OuterSpace = env.get('OuterSpace');

    await env.deployViaProxy(
      'BasicSpaceshipMarket',
      {
        account: deployer as `0x${string}`,
        artifact: artifacts.BasicSpaceshipMarket,
        args: [OuterSpace.address],
      },
      {
        proxyDisabled: false,
      },
    );
  },
  {
    tags: ['BasicSpaceshipMarket'],
  },
);