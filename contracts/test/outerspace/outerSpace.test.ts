// Test for OuterSpace contract - planet acquisition
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {setupOuterSpaceFixtures} from '../fixtures/setupFixtures.js';
import {SpaceInfo} from 'conquest-eth-common';
import {acquire} from './utils.js';

describe('OuterSpace', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const {provider, networkHelpers: nh} = await network.connect();
		networkHelpers = nh;
		const fixtures = setupOuterSpaceFixtures(provider);
		deployAll = fixtures.deployAll;
	});

	it('user can acquire virgin planet', async function () {
		const {env, OuterSpace, ConquestCredits, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const spaceInfo = new SpaceInfo();
		const pointer = spaceInfo.findNextPlanet();
		const player = unnamedAccounts[0];

		const hash = await acquire(
			env,
			OuterSpace,
			ConquestCredits,
			player,
			pointer.data,
		);

		const receipt = await env.viem.publicClient.waitForTransactionReceipt({
			hash,
		});

		assert.ok(receipt, 'Transaction receipt should exist');
		assert.ok(receipt.logs, 'Transaction should have logs');
	});
});
