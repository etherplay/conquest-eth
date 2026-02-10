import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		console.log(`deploying TokenDistributor...`);
		await env.deploy('TokenDistributor', {
			account: deployer,
			artifact: artifacts.TokenDistributor,
			args: [],
			gas: 1000000n,
		});
		console.log(`...DONE`);
	},
	{
		tags: ['TokenDistributor', 'TokenDistributor_deploy'],
	},
);
