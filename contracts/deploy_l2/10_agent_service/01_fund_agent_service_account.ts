import {deployScript} from '../../rocketh/deploy.js';
import {parseEther} from 'viem';

export default deployScript(
	async (env) => {
		const {deployer, agentService} = env.namedAccounts;
		if (agentService) {
			console.log(`FUNDING AGENT SERVICE (${agentService}) ...`);
			const currentBalance = await env.viem.publicClient.getBalance({
				address: agentService as `0x${string}`,
			});
			if (currentBalance < parseEther('1')) {
				await env.tx({
					account: deployer as `0x${string}`,
					to: agentService as `0x${string}`,
					value: parseEther('10'),
				});
			}
		} else {
			console.log(`NO AGENT SERVICE CONFIGURED`);
		}
	},
	{
		tags: ['agentService'],
	},
);
