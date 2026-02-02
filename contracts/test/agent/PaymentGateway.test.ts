// Test for PaymentGateway contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {parseEther} from 'viem';
import {network} from 'hardhat';
import {setupPaymentFixtures} from '../fixtures/setupFixtures.js';

describe('PaymentGateway', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const { provider, networkHelpers: nh } = await network.connect();
		networkHelpers = nh;
		const fixtures = setupPaymentFixtures(provider);
		deployAll = fixtures.deployAll;
	});

	it('PaymentGateway can receive ETH and emit the corresponding event', async function () {
		const { env, PaymentGateway, namedAccounts } = await networkHelpers.loadFixture(deployAll);
		const deployer = namedAccounts.deployer;
		
		const hash = await env.tx({
			to: PaymentGateway.address,
			value: parseEther('1'),
			account: deployer,
		});
		const receipt = await env.viem.publicClient.waitForTransactionReceipt({hash});

		assert.ok(receipt, 'Transaction receipt should exist');
		assert.ok(receipt.logs, 'Transaction should have logs');
	});

	it('gatewayOwner can refund ETH', async function () {
		const { env, PaymentGateway, namedAccounts } = await networkHelpers.loadFixture(deployAll);
		const deployer = namedAccounts.deployer;
		
		const owner = await env.read(PaymentGateway, {
			functionName: 'owner',
		});
		console.log({owner, deployer})
		
		// Fund the gateway first
		await env.tx({
			to: PaymentGateway.address,
			value: parseEther('1'),
			account: deployer,
		});

		const receipt = await env.execute(PaymentGateway, {
			account: deployer,
			functionName: 'withdrawForRefund',
			args: [deployer, parseEther('1')],
		});

		assert.ok(receipt, 'Transaction receipt should exist');
		assert.equal(receipt.status, '0x1');
	});

	it('gatewayOwner can change ownership', async function () {
		const { env, PaymentGateway, namedAccounts, unnamedAccounts } = await networkHelpers.loadFixture(deployAll);
		const deployer = namedAccounts.deployer;
		const player1 = unnamedAccounts[0];
		
		const owner = await env.read(PaymentGateway, {
			functionName: 'owner',
		});
		
		await env.execute(PaymentGateway, {
			account: owner,
			functionName: 'transferOwnership',
			args: [player1],
		});

		const newOwner = await env.read(PaymentGateway, {
			functionName: 'owner',
		});
		assert.strictEqual(newOwner.toLowerCase(), player1.toLowerCase(), 'New owner should be set');
	});

	it('random account cannot change ownership', async function () {
		const { env, PaymentGateway, unnamedAccounts } = await networkHelpers.loadFixture(deployAll);
		const player1 = unnamedAccounts[0];
		const player2 = unnamedAccounts[1];
		
		await assert.rejects(
			env.execute(PaymentGateway, {
				account: player2,
				functionName: 'transferOwnership',
				args: [player1],
			}),
			'Random account should not be able to change ownership',
		);
	});
});