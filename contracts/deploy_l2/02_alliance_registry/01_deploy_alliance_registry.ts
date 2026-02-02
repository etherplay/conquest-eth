import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;

    await env.deployViaProxy(
      'AllianceRegistry',
      {
        account: deployer as `0x${string}`,
        artifact: artifacts.AllianceRegistry,
      },
      {
        proxyDisabled: false,
      },
    );
  },
  {
    tags: ['AllianceRegistry', 'AllianceRegistry_deploy'],
  },
);