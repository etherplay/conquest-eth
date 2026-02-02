import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		await env.deploy('ConquestCredits', {
			account: deployer as `0x${string}`,
			artifact: artifacts.ConquestCredits,
			args: [deployer],
		});
	},
	{
		tags: ['ConquestCredits', 'ConquestCredits_deploy'],
	},
);
