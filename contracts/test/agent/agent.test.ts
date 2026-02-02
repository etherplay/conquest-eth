// Test for Agent deterministic deployment
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {outerSpaceFixture} from '../fixtures/outerspaceAndPlayerWithTokens.js';

describe('Agent', function () {
	let fixture: Awaited<ReturnType<typeof outerSpaceFixture>>;

	before(async () => {
		fixture = await outerSpaceFixture();
	});

	it('Agent can be deployed deterministically', async function () {
		const {env, players, OuterSpace} = fixture;
		
		// Deploy Agent contract deterministically
		// In v2, we use env.deploy() for contract deployment
		const deployment = await env.deploy({
			name: 'AgentTest',
			account: players[0].address,
			artifact: 'Agent',
			args: [players[0].address, OuterSpace.address],
		});

		console.log({
			address: deployment.address,
			gasUsed: deployment.receipt?.gasUsed?.toString(),
		});

		assert.ok(deployment.address, 'Agent should be deployed');
		assert.ok(deployment.address.startsWith('0x'), 'Address should be a valid EVM address');
	});
});