import {deployScript} from '../../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer, claimKeyDistributor} = env.namedAccounts;

    const OuterSpaceDeployment = env.get('OuterSpace');
    const FreePlayToken = env.get('FreePlayToken');

    const isMinter = await env.read(FreePlayToken, {
      functionName: 'minters',
      args: [deployer],
    });
    if (!isMinter) {
      await env.execute(FreePlayToken, {
        account: deployer as `0x${string}`,
        functionName: 'setMinter',
        args: [deployer, true],
      });
    }

    const isBurner = await env.read(FreePlayToken, {
      functionName: 'burners',
      args: [OuterSpaceDeployment.address],
    });
    if (!isBurner) {
      await env.execute(FreePlayToken, {
        account: deployer as `0x${string}`,
        functionName: 'setBurner',
        args: [OuterSpaceDeployment.address, true],
      });
    }
  },
  {
    tags: ['FreePlayToken', 'FreePlayToken_setup'],
    dependencies: ['FreePlayToken_deploy'],
  },
);