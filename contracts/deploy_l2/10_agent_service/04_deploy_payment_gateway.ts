import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		await env.deploy('PaymentGateway', {
			account: deployer as `0x${string}`,
			artifact: artifacts.PaymentGateway,
			args: [deployer], // TODO
		});
	},
	{
		tags: ['PaymentGateway', 'PaymentGateway_deploy'],
	},
);
