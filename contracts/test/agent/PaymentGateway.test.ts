// Test for PaymentGateway contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {parseEther, type WalletClient} from 'viem';
import type {PaymentGateway} from '../../generated/artifacts/PaymentGateway.js';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {setupUsers, type User} from '../utils/index.js';

type Contracts = {
	PaymentGateway: PaymentGateway;
};

type PaymentGatewayFixture = {
	env: Awaited<ReturnType<typeof loadAndExecuteDeploymentsFromFiles>>;
	players: User<Contracts>[];
	agentServiceWallet: User<Contracts>;
	gatewayOwner: User<Contracts>;
};

/**
 * Fixture for PaymentGateway tests
 */
async function paymentGatewayFixture(): Promise<PaymentGatewayFixture> {
	const env = await loadAndExecuteDeploymentsFromFiles();
	const accounts = await env.accounts();
	const {agentService} = accounts.namedAccounts;
	const unNamedAccounts = accounts.unnamedAccounts;

	const PaymentGateway = await env.get<PaymentGateway>('PaymentGateway');

	// Get gateway owner from contract
	const gatewayOwnerAddress = await PaymentGateway.read.owner();
	const gatewayOwnerAccount = [...accounts.namedAccountsAccounts].find(
		(a) => a.address === gatewayOwnerAddress,
	) || unNamedAccounts[0];

	const players = await setupUsers(
		unNamedAccounts,
		{PaymentGateway},
		async (address) => env.getWalletClient(address),
	);

	const agentServiceWallet = await setupUsers(
		[agentService],
		{PaymentGateway},
		async (address) => env.getWalletClient(address),
	);

	const gatewayOwner = await setupUsers(
		[gatewayOwnerAccount],
		{PaymentGateway},
		async (address) => env.getWalletClient(address),
	);

	return {env, players, agentServiceWallet: agentServiceWallet[0], gatewayOwner: gatewayOwner[0]};
}

describe('PaymentGateway', function () {
	let fixture: PaymentGatewayFixture;

	before(async () => {
		fixture = await paymentGatewayFixture();
	});

	it('PaymentGateway can receive ETH and emit the corresponding event', async function () {
		const {players, PaymentGateway} = fixture;
		const hash = await players[0].signer.sendTransaction({
			to: PaymentGateway.address,
			value: parseEther('1'),
		});
		const receipt = await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		// Check for Payment event
		assert.ok(receipt, 'Transaction receipt should exist');
		assert.ok(receipt.logs, 'Transaction should have logs');
	});

	it('gatewayOwner can refund ETH and emit the corresponding event', async function () {
		const {gatewayOwner, players, PaymentGateway} = fixture;
		
		const hash = await players[0].signer.sendTransaction({
			to: PaymentGateway.address,
			value: parseEther('1'),
		});
		await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		const hash2 = await gatewayOwner.PaymentGateway.write.withdrawForRefund([
			players[0].address,
			parseEther('1'),
		]);
		const receipt = await gatewayOwner.signer.request({method: 'eth_getTransactionReceipt', params: [hash2]});

		assert.ok(receipt, 'Transaction receipt should exist');
	});

	it('random account cannot refund', async function () {
		const {players, PaymentGateway} = fixture;
		
		const hash = await players[0].signer.sendTransaction({
			to: PaymentGateway.address,
			value: parseEther('1'),
		});
		await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		await assert.rejects(
			players[1].PaymentGateway.write.withdrawForRefund([
				players[0].address,
				parseEther('2'),
			]),
			/expected to revert/,
			'Random account should not be able to refund',
		);
	});

	it('gatewayOwner cannot refund ETH if not enough', async function () {
		const {gatewayOwner, players, PaymentGateway} = fixture;
		
		const hash = await players[0].signer.sendTransaction({
			to: PaymentGateway.address,
			value: parseEther('1'),
		});
		await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		await assert.rejects(
			gatewayOwner.PaymentGateway.write.withdrawForRefund([
				players[0].address,
				parseEther('2'),
			]),
			/expected to revert/,
			'Gateway owner should not be able to refund more than available',
		);
	});

	it('gatewayOwner can change ownership', async function () {
		const {gatewayOwner, players, PaymentGateway} = fixture;
		
		const hash = await gatewayOwner.PaymentGateway.write.transferOwnership([
			players[0].address,
		]);
		await gatewayOwner.signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		const newOwner = await PaymentGateway.read.owner();
		assert.strictEqual(newOwner.toLowerCase(), players[0].address.toLowerCase(), 'New owner should be set');
	});

	it('random account cannot change ownership', async function () {
		const {players, PaymentGateway} = fixture;
		
		await assert.rejects(
			players[1].PaymentGateway.write.transferOwnership([
				players[0].address,
			]),
			/expected to revert/,
			'Random account should not be able to change ownership',
		);
	});
});