// Test for BasicAllianceFactory contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {pad} from 'viem';
import {network} from 'hardhat';
import {setupOuterSpaceFixtures} from '../fixtures/setupFixtures.js';

describe('Basic Alliance', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const {provider, networkHelpers: nh} = await network.connect();
		networkHelpers = nh;
		const fixtures = setupOuterSpaceFixtures(provider);
		deployAll = fixtures.deployAll;
	});

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
		});

		const nonce0 = 0;
		const message0 = `Join Alliance ${pad(allianceAddress.toLowerCase(), {size: 20})}${
			nonce0 === 0 ? '' : ` (nonce: ${String(nonce0).padStart(10)})`
		}`;
		const signature0 = await env.viem.walletClient.account!.signMessage({
			message: message0,
		});

		const nonce1 = 0;
		const message1 = `Join Alliance ${pad(allianceAddress.toLowerCase(), {size: 20})}${
			nonce1 === 0 ? '' : ` (nonce: ${String(nonce0).padStart(10)})`
		}`;
		const signature1 = await env.viem.walletClient.account!.signMessage({
			message: message1,
		});

		console.log({message0, message1});

		const hash = await env.execute(BasicAllianceFactory, {
			functionName: 'instantiate',
			args: [
				player0,
				[
					{
						addr: player0,
						nonce: BigInt(nonce0),
						signature: signature0,
					},
					{
						addr: player1,
						nonce: BigInt(nonce1),
						signature: signature1,
					},
				],
				'0x0000000000000000000000000000000000000000000000000000000000000000',
			],
			account: player0,
		});
		const receipt = await env.viem.publicClient.waitForTransactionReceipt({
			hash,
		});

		assert.ok(receipt, 'Alliance should be created');
	});
});
