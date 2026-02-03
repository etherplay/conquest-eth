import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from '../fixtures/index.js';
import {artifacts} from '../../rocketh/deploy.js';
import assert from 'node:assert';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('Combat: testing complex combat mechanics with real Solidity', function () {
	it('can deploy Combat', async function () {
		const {env, OuterSpace, namedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		// Get the linkedData from OuterSpace which contains the config
		const outerSpaceLinkedData = OuterSpace.linkedData;
		console.log(
			`OuterSpace linkedData: ${JSON.stringify(outerSpaceLinkedData, null, 2)}`,
		);

		const Combat = await env.deploy('Combat', {
			artifact: artifacts.Combat,
			account: namedAccounts.deployer,
			args: [outerSpaceLinkedData as any],
		});

		assert.ok(Combat.address);
	});
});
