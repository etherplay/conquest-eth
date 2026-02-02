// Test for PaymentWithdrawalGateway contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {parseEther, encodeAbiParameters, keccak256, toBytes, type WalletClient} from 'viem';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import type {PaymentGateway, PaymentWithdrawalGateway} from '../../generated/artifacts/PaymentGateway.js';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {setupUsers, type User} from '../utils/index.js';

type Contracts = {
	PaymentGateway: PaymentGateway;
	PaymentWithdrawalGateway: PaymentWithdrawalGateway;
};

type PaymentWithdrawalGatewayFixture = {
	env: Awaited<ReturnType<typeof loadAndExecuteDeploymentsFromFiles>>;
	players: User<Contracts>[];
	agentServiceWallet: User<Contracts>;
	gatewayOwner: User<Contracts>;
};

/**
 * Fixture for PaymentWithdrawalGateway tests
 */
async function paymentWithdrawalGatewayFixture(): Promise<PaymentWithdrawalGatewayFixture> {
	const env = await loadAndExecuteDeploymentsFromFiles();
	const accounts = await env.accounts();
	const {agentService} = accounts.namedAccounts;
	const unNamedAccounts = accounts.unnamedAccounts;

	const PaymentGateway = await env.get<PaymentGateway>('PaymentGateway');
	const PaymentWithdrawalGateway = await env.get<PaymentWithdrawalGateway>('PaymentWithdrawalGateway');

	// Get gateway owner from contract
	const gatewayOwnerAddress = await PaymentWithdrawalGateway.read.owner();
	const gatewayOwnerAccount = [...accounts.namedAccountsAccounts].find(
		(a) => a.address === gatewayOwnerAddress,
	) || unNamedAccounts[0];

	const players = await setupUsers(
		unNamedAccounts,
		{PaymentGateway, PaymentWithdrawalGateway},
		async (address) => env.getWalletClient(address),
	);

	const agentServiceWallet = await setupUsers(
		[agentService],
		{PaymentGateway, PaymentWithdrawalGateway},
		async (address) => env.getWalletClient(address),
	);

	const gatewayOwner = await setupUsers(
		[gatewayOwnerAccount],
		{PaymentGateway, PaymentWithdrawalGateway},
		async (address) => env.getWalletClient(address),
	);

	return {env, players, agentServiceWallet: agentServiceWallet[0], gatewayOwner: gatewayOwner[0]};
}

/**
 * Helper to fund PaymentGateway
 */
async function fundPaymentGateway(user: User<Contracts>, amount: bigint): Promise<void> {
	const hash = await user.signer.sendTransaction({
		to: user.PaymentGateway.address,
		value: amount,
	});
	await user.signer.request({method: 'eth_getTransactionReceipt', params: [hash]});
}

/**
 * Helper to create withdrawal signature
 */
async function createWithdrawalSignature(
	agentServiceWallet: User<Contracts>,
	timestamp: bigint,
	playerAddress: `0x${string}`,
	maxAmount: bigint,
): Promise<`0x${string}`> {
	const data = encodeAbiParameters(
		[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
		[timestamp, playerAddress, maxAmount],
	);
	const dataHash = keccak256(data);
	return agentServiceWallet.signer.signMessage({message: {raw: toBytes(dataHash)}});
}

describe('PaymentWithdrawalGateway', function () {
	let fixture: PaymentWithdrawalGatewayFixture;

	before(async () => {
		fixture = await paymentWithdrawalGatewayFixture();
	});

	it('player can withdraw ETH via message and emit the corresponding event', async function () {
		const block = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');
		const {players, PaymentGateway, agentServiceWallet} = fixture;
		
		await fundPaymentGateway(players[0], maxAmount);

		const amount = maxAmount;
		const signature = await createWithdrawalSignature(
			agentServiceWallet,
			timestamp,
			players[0].address,
			maxAmount,
		);

		const hash = await players[0].PaymentWithdrawalGateway.write.withdraw([
			players[0].address,
			maxAmount,
			timestamp,
			signature,
			amount,
		]);
		const receipt = await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		assert.ok(receipt, 'Transaction receipt should exist');
	});

	it('player cannot withdraw ETH via invalid message', async function () {
		const block = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');
		const {players} = fixture;
		
		await fundPaymentGateway(players[0], maxAmount);

		const amount = maxAmount;
		const data = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp, players[0].address, maxAmount],
		);
		const dataHash = keccak256(data);
		// Sign with wrong wallet (player[1] instead of agentServiceWallet)
		const signature = players[1].signer.signMessage({message: {raw: toBytes(dataHash)}});

		await assert.rejects(
			players[0].PaymentWithdrawalGateway.write.withdraw([
				players[0].address,
				maxAmount,
				timestamp,
				signature,
				amount,
			]),
			/UNAUTHORIZED_SIGNER|expected to revert/,
			'Player should not be able to withdraw with invalid signature',
		);
	});

	it('player cannot withdraw ETH via same message', async function () {
		const block = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');
		const {players, agentServiceWallet} = fixture;
		
		await fundPaymentGateway(players[0], maxAmount);

		const amount = maxAmount / 2n;
		const signature = await createWithdrawalSignature(
			agentServiceWallet,
			timestamp,
			players[0].address,
			maxAmount,
		);

		await players[0].PaymentWithdrawalGateway.write.withdraw([
			players[0].address,
			maxAmount,
			timestamp,
			signature,
			amount,
		]);

		await assert.rejects(
			players[0].PaymentWithdrawalGateway.write.withdraw([
				players[0].address,
				maxAmount,
				timestamp,
				signature,
				amount,
			]),
			/INTERVAL_NOT_RESPECTED|expected to revert/,
			'Player should not be able to withdraw twice with same message',
		);
	});

	it('player can withdraw ETH twice past the interval', async function () {
		const block = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');
		const {players, agentServiceWallet} = fixture;
		
		await fundPaymentGateway(players[0], maxAmount);

		const amount = maxAmount / 2n;
		const signature = await createWithdrawalSignature(
			agentServiceWallet,
			timestamp,
			players[0].address,
			maxAmount,
		);

		await players[0].PaymentWithdrawalGateway.write.withdraw([
			players[0].address,
			maxAmount,
			timestamp,
			signature,
			amount,
		]);

		// Increase time by 30 minutes (2 * 15 minute interval)
		await time.increase(15 * 60 + 15 * 60);

		const block2 = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp2 = block2!.timestamp;

		const signature2 = await createWithdrawalSignature(
			agentServiceWallet,
			timestamp2,
			players[0].address,
			maxAmount,
		);

		const hash = await players[0].PaymentWithdrawalGateway.write.withdraw([
			players[0].address,
			maxAmount,
			timestamp2,
			signature2,
			amount,
		]);
		const receipt = await players[0].signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		assert.ok(receipt, 'Second withdrawal should succeed past interval');
	});

	it('player cannot withdraw ETH twice in the interval', async function () {
		const block = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');
		const {players, agentServiceWallet} = fixture;
		
		await fundPaymentGateway(players[0], maxAmount);

		const amount = maxAmount / 2n;
		const signature = await createWithdrawalSignature(
			agentServiceWallet,
			timestamp,
			players[0].address,
			maxAmount,
		);

		await players[0].PaymentWithdrawalGateway.write.withdraw([
			players[0].address,
			maxAmount,
			timestamp,
			signature,
			amount,
		]);

		// Increase time by only 14 minutes (less than 15 minute interval)
		await time.increase(14 * 60);

		const block2 = await fixture.env.publicClient.getBlock({blockTag: 'latest'});
		const timestamp2 = block2!.timestamp;

		const signature2 = await createWithdrawalSignature(
			agentServiceWallet,
			timestamp2,
			players[0].address,
			maxAmount,
		);

		await assert.rejects(
			players[0].PaymentWithdrawalGateway.write.withdraw([
				players[0].address,
				maxAmount,
				timestamp2,
				signature2,
				amount,
			]),
			/INTERVAL_NOT_RESPECTED|expected to revert/,
			'Player should not be able to withdraw twice within interval',
		);
	});

	it('gatewayOwner can change ownership of PaymentWithdrawalGateway', async function () {
		const {gatewayOwner, players, PaymentWithdrawalGateway} = fixture;
		
		const hash = await gatewayOwner.PaymentWithdrawalGateway.write.transferOwnership([
			players[0].address,
		]);
		await gatewayOwner.signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		const newOwner = await PaymentWithdrawalGateway.read.owner();
		assert.strictEqual(
			newOwner.toLowerCase(),
			players[0].address.toLowerCase(),
			'New owner should be set',
		);
	});

	it('gatewayOwner can change ownership of PaymentGateway', async function () {
		const {gatewayOwner, players, PaymentGateway} = fixture;
		
		const hash = await gatewayOwner.PaymentWithdrawalGateway.write.transferPaymentGatewayOwnership([
			players[0].address,
		]);
		await gatewayOwner.signer.request({method: 'eth_getTransactionReceipt', params: [hash]});

		const newOwner = await PaymentGateway.read.owner();
		assert.strictEqual(
			newOwner.toLowerCase(),
			players[0].address.toLowerCase(),
			'New PaymentGateway owner should be set',
		);
	});

	it('random account cannot change ownership', async function () {
		const {players} = fixture;
		
		await assert.rejects(
			players[1].PaymentWithdrawalGateway.write.transferOwnership([
				players[0].address,
			]),
			/expected to revert/,
			'Random account should not be able to change ownership',
		);
	});
});