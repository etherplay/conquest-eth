import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		await env.deploy('TokenDistributor', {
			account: deployer,
			artifact: artifacts.TokenDistributor,
		});
	},
	{
		tags: ['TokenDistributor', 'TokenDistributor_deploy'],
	},
);
