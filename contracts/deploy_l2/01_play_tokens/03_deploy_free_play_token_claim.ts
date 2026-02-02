import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;

    const PlayToken = env.get('PlayToken');
    const FreePlayToken = env.get('FreePlayToken');

    const FreePlayTokenClaim = await env.deploy('FreePlayTokenClaim', {
      account: deployer as `0x${string}`,
      artifact: artifacts.FreePlayTokenClaim,
      args: [deployer, PlayToken.address, FreePlayToken.address],
    });

    const isMinter = await env.read(FreePlayToken, {
      functionName: 'minters',
      args: [FreePlayTokenClaim.address],
    });
    if (!isMinter) {
      await env.execute(FreePlayToken, {
        account: deployer as `0x${string}`,
        functionName: 'setMinter',
        args: [FreePlayTokenClaim.address, true],
      });
    }
  },
  {
    tags: ['FreePlayTokenClaim', 'FreePlayTokenClaim_deploy'],
    dependencies: ['PlayToken_deploy', 'FreePlayToken_deploy'],
  },
);