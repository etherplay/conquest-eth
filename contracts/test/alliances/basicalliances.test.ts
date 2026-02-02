// Test for BasicAllianceFactory contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {pad, type WalletClient} from 'viem';
import {outerSpaceFixture} from '../fixtures/outerspaceAndPlayerWithTokens.js';

describe('Basic Alliance', function () {
	let fixture: Awaited<ReturnType<typeof outerSpaceFixture>>;

	before(async () => {
		fixture = await outerSpaceFixture();
	});

	it('create alliance', async function () {
		const {players, BasicAllianceFactory} = fixture;

		// Get the predicted alliance address for the given data
		const allianceAddress = await BasicAllianceFactory.read.getAddress([
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		]);

		const nonce0 = 0;
		const message0 = `Join Alliance ${pad(allianceAddress.toLowerCase(), {size: 20})}${
			nonce0 === 0 ? '' : ` (nonce: ${String(nonce0).padStart(10)})`
		}`;
		const player0Signature = await players[0].signer.signMessage({message: message0});

		const nonce1 = 0;
		const message1 = `Join Alliance ${pad(allianceAddress.toLowerCase(), {size: 20})}${
			nonce1 === 0 ? '' : ` (nonce: ${String(nonce0).padStart(10)})`
		}`;
		const player1Signature = await players[1].signer.signMessage({message: message1});

		console.log({message0, message1});

		const hash = await players[0].BasicAllianceFactory.write.instantiate([
			players[0].address,
			[
				{
					addr: players[0].address,
					nonce: BigInt(nonce0),
					signature: player0Signature,
				},
				{
					addr: players[1].address,
					nonce: BigInt(nonce1),
					signature: player1Signature,
				},
			],
			'0x0000000000000000000000000000000000000000000000000000000000000000',
		]);
		const receipt = await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		assert.ok(receipt, 'Alliance should be created');
	});
});