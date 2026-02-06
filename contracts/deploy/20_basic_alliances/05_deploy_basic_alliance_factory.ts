import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		const networkName = await env.name;

		// TODO use network tags ?
		const localTesting =
			networkName === 'hardhat' || networkName === 'localhost';

		const allianceRegistry = env.get('AllianceRegistry');

		const frontendBaseURI = localTesting
			? 'http://localhost:3000/basic-alliances/alliances/#'
			: `https://${
					networkName === 'mainnet' ? '' : networkName.replace('_', '-')
				}.conquest.game/basic-alliances/alliances/#`;

		await env.deploy('BasicAllianceFactory', {
			account: deployer as `0x${string}`,
			artifact: artifacts.BasicAlliance,
			args: [allianceRegistry.address, deployer, frontendBaseURI],
		});
	},
	{
		dependencies: ['AllianceRegistry_deploy'],
		tags: ['BasicAllianceFactory', 'BasicAllianceFactory_deploy'],
	},
);
