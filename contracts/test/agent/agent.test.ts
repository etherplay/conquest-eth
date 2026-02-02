// Test for Agent deterministic deployment
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {setupFixtures} from '../fixtures/setupFixtures.js';

describe('Agent', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const {provider, networkHelpers: nh} = await network.connect();
		networkHelpers = nh;
		const fixtures = setupFixtures(provider);
		deployAll = fixtures.deployAll;
	});

	it('Agent can be deployed deterministically', async function () {
		const {env, namedAccounts} = await networkHelpers.loadFixture(deployAll);
		const deployer = namedAccounts.deployer;
		const OuterSpace = env.get('OuterSpace');

		// Deploy Agent contract deterministically
		const deployment = await env.deploy({
			name: 'AgentTest',
			account: deployer,
			args: [deployer, OuterSpace.address],
		});

		console.log({
			address: deployment.address,
			gasUsed: deployment.receipt?.gasUsed?.toString(),
		});

		assert.ok(deployment.address, 'Agent should be deployed');
		assert.ok(
			deployment.address.startsWith('0x'),
			'Address should be a valid EVM address',
		);
	});
});
