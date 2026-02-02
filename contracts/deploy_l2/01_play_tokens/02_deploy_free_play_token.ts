import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;

    const PlayToken = env.get('PlayToken');

    await env.deployViaProxy(
      'FreePlayToken',
      {
        account: deployer as `0x${string}`,
        artifact: artifacts.FreePlayToken,
        args: [PlayToken.address, deployer],
      },
      {
        proxyDisabled: false,
        execute: 'postUpgrade',
      },
    );
  },
  {
    tags: ['FreePlayToken', 'FreePlayToken_deploy'],
    dependencies: ['PlayToken_deploy'],
  },
);
