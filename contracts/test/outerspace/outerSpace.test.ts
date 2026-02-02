// Test for OuterSpace contract - planet acquisition
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {SpaceInfo} from 'conquest-eth-common';
import {acquire} from './utils.js';
import { setupFixtures } from '../fixtures/setupFixtures.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);


describe('OuterSpace', function () {
	

	it('user can acquire virgin planet', async function () {
		const {env, OuterSpace, ConquestCredits, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const spaceInfo = new SpaceInfo(OuterSpace.linkedData as any);
		const pointer = spaceInfo.findNextPlanet();
		const player = unnamedAccounts[0];

		const receipt = await acquire(
			env,
			OuterSpace,
			ConquestCredits,
			player,
			pointer.data,
		);


		assert.ok(receipt, 'Transaction receipt should exist');
		assert.ok(receipt.logs, 'Transaction should have logs');
	});
});
