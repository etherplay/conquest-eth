// Test for BasicAllianceFactory contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {pad} from 'viem';
import {network} from 'hardhat';
import {setupFixtures} from '../fixtures/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('Basic Alliance', function () {
	it('create alliance', async function () {
		const {env, BasicAllianceFactory, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const player0 = unnamedAccounts[0];
		const player1 = unnamedAccounts[1];

		// Get the predicted alliance address for the given data
		const allianceAddress = await env.read(BasicAllianceFactory, {
			functionName: 'getAddress',
			args: [
				'0x0000000000000000000000000000000000000000000000000000000000000000',
			],
			account: player0,
		});

		const nonce0 = 0;
		const message0 = `Join Alliance ${pad(allianceAddress.toLowerCase() as `0x${string}`, {size: 20})}${
			nonce0 === 0 ? '' : ` (nonce: ${String(nonce0).padStart(10)})`
		}`;
		const signature0 = await env.viem.walletClient.signMessage({
			account: player0,
			message: message0,
		});

		const nonce1 = 0;
		const message1 = `Join Alliance ${pad(allianceAddress.toLowerCase() as `0x${string}`, {size: 20})}${
			nonce1 === 0 ? '' : ` (nonce: ${String(nonce0).padStart(10)})`
		}`;
		const signature1 = await env.viem.walletClient.signMessage({
			account: player1,
			message: message1,
		});

		console.log({message0, message1});

		const receipt = await env.execute(BasicAllianceFactory, {
			functionName: 'instantiate',
			args: [
				player0,
				[
					{
						addr: player0,
						nonce: nonce0,
						signature: signature0,
					},
					{
						addr: player1,
						nonce: nonce1,
						signature: signature1,
					},
				],
				'0x0000000000000000000000000000000000000000000000000000000000000000',
			],
			account: player0,
		});

		assert.ok(receipt, 'Alliance should be created');
	});
});
