// Test for OuterSpace contract - planet acquisition
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {outerSpaceFixture} from '../fixtures/outerspaceAndPlayerWithTokens.js';
import {acquire} from './utils.js';

describe('OuterSpace', function () {
	let fixture: Awaited<ReturnType<typeof outerSpaceFixture>>;

	before(async () => {
		fixture = await outerSpaceFixture();
	});

	it('user can acquire virgin planet', async function () {
		const {players, spaceInfo} = fixture;
		const pointer = spaceInfo.findNextPlanet();
		const hash = await acquire(players[0], pointer.data);
		
		const receipt = await players[0].signer.request({
			method: 'eth_getTransactionReceipt',
			params: [hash],
		});

		assert.ok(receipt, 'Transaction receipt should exist');
		assert.ok(receipt.logs, 'Transaction should have logs');
	});
});