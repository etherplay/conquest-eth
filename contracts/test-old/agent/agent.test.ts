import {deployments} from 'hardhat';
import {setup} from '../fixtures/outerspaceAndPlayerWithTokens';

describe('Agent', function () {
	it('Agent can be deployed deterministicly', async function () {
		const {OuterSpace, players} = await setup();
		const deployment = await deployments.deploy('AgentTest', {
			from: players[0].address,
			contract: 'Agent',
			args: [players[0].address, OuterSpace.address],
			deterministicDeployment: true,
		});
		console.log({
			address: deployment.address,
			gasUsed: deployment.receipt?.gasUsed.toString(),
		});
	});
});
