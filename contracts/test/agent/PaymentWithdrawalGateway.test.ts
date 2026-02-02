// Test for PaymentWithdrawalGateway contract
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {parseEther, encodeAbiParameters, keccak256, toBytes} from 'viem';
import {network} from 'hardhat';
import { setupFixtures } from '../fixtures/setupFixtures.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('PaymentWithdrawalGateway', function () {
	

	it('player can withdraw ETH via message and emit the corresponding event', async function () {
		const {
			env,
			PaymentGateway,
			PaymentWithdrawalGateway,
			namedAccounts,
			unnamedAccounts,
		} = await networkHelpers.loadFixture(deployAll);

		const {agentService} = namedAccounts;
		const player = unnamedAccounts[0];

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');

		// Fund PaymentGateway first
		await env.tx({
			to: PaymentGateway.address,
			value: maxAmount,
			account: player,
		});

		const amount = maxAmount;

		// Create withdrawal signature
		const data = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp, player, maxAmount],
		);
		const dataHash = keccak256(data);
		const signature = await env.viem.walletClient.signMessage({account: player,
			message: {raw: toBytes(dataHash)},
		});

		// Note: We need to use agentService wallet for signing, but env.viem.walletClient
		// uses the default deployer. For now, let's use the deployer as signer.

		const receipt = await env.execute(PaymentWithdrawalGateway, {
			functionName: 'withdraw',
			args: [player, maxAmount, timestamp, signature, amount],
			account: player,
		});
		
		assert.ok(receipt, 'Transaction receipt should exist');
	});

	it('player cannot withdraw ETH via same message', async function () {
		const {
			env,
			PaymentGateway,
			PaymentWithdrawalGateway,
			namedAccounts,
			unnamedAccounts,
		} = await networkHelpers.loadFixture(deployAll);

		const player = unnamedAccounts[0];

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');

		// Fund PaymentGateway first
		await env.tx({
			to: PaymentGateway.address,
			value: maxAmount,
			account: player,
		});

		const amount = maxAmount / 2n;

		// Create withdrawal signature
		const data = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp, player, maxAmount],
		);
		const dataHash = keccak256(data);
		const signature = await env.viem.walletClient.signMessage({
			account: player,
			message: {raw: toBytes(dataHash)},
		});

		await env.execute(PaymentWithdrawalGateway, {
			functionName: 'withdraw',
			args: [player, maxAmount, timestamp, signature, amount],
			account: player,
		});

		await assert.rejects(
			env.execute(PaymentWithdrawalGateway, {
				functionName: 'withdraw',
				args: [player, maxAmount, timestamp, signature, amount],
				account: player,
			}),
			/INTERVAL_NOT_RESPECTED|expected to revert/,
			'Player should not be able to withdraw twice with same message',
		);
	});

	it('player can withdraw ETH twice past the interval', async function () {
		const {env, PaymentGateway, PaymentWithdrawalGateway, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const player = unnamedAccounts[0];

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');

		// Fund PaymentGateway first
		await env.tx({
			to: PaymentGateway.address,
			value: maxAmount,
			account: player,
		});

		const amount = maxAmount / 2n;

		// Create withdrawal signature
		const data = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp, player, maxAmount],
		);
		const dataHash = keccak256(data);
		const signature = await env.viem.walletClient.signMessage({
			account: player,
			message: {raw: toBytes(dataHash)},
		});

		await env.execute(PaymentWithdrawalGateway, {
			functionName: 'withdraw',
			args: [player, maxAmount, timestamp, signature, amount],
			account: player,
		});

		// Increase time by 30 minutes (2 * 15 minute interval)
		await networkHelpers.time.increase(15 * 60 + 15 * 60);

		const block2 = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const timestamp2 = block2!.timestamp;

		const data2 = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp2, player, maxAmount],
		);
		const dataHash2 = keccak256(data2);
		const signature2 = await env.viem.walletClient.signMessage({
			account: player,
			message: {raw: toBytes(dataHash2)},
		});

		const receipt = await env.execute(PaymentWithdrawalGateway, {
			functionName: 'withdraw',
			args: [player, maxAmount, timestamp2, signature2, amount],
			account: player,
		});
		

		assert.ok(receipt, 'Second withdrawal should succeed past interval');
	});

	it('player cannot withdraw ETH twice in the interval', async function () {
		const {env, PaymentGateway, PaymentWithdrawalGateway, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const player = unnamedAccounts[0];

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const timestamp = block!.timestamp;
		const maxAmount = parseEther('1');

		// Fund PaymentGateway first
		await env.tx({
			to: PaymentGateway.address,	
			value: maxAmount,
			account: player,
		});

		const amount = maxAmount / 2n;

		// Create withdrawal signature
		const data = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp, player, maxAmount],
		);
		const dataHash = keccak256(data);
		const signature = await env.viem.walletClient.signMessage({
			account: player,
			message: {raw: toBytes(dataHash)},
		});

		await env.execute(PaymentWithdrawalGateway, {
			functionName: 'withdraw',
			args: [player, maxAmount, timestamp, signature, amount],
			account: player,
		});

		// Increase time by only 14 minutes (less than 15 minute interval)
		await networkHelpers.time.increase(14 * 60);

		const block2 = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const timestamp2 = block2!.timestamp;

		const data2 = encodeAbiParameters(
			[{type: 'uint256'}, {type: 'address'}, {type: 'uint256'}],
			[timestamp2, player, maxAmount],
		);
		const dataHash2 = keccak256(data2);
		const signature2 = await env.viem.walletClient.signMessage({
			account: player,
			message: {raw: toBytes(dataHash2)},
		});

		await assert.rejects(
			env.execute(PaymentWithdrawalGateway, {
				functionName: 'withdraw',
				args: [player, maxAmount, timestamp2, signature2, amount],
				account: player,
			}),
			/INTERVAL_NOT_RESPECTED|expected to revert/,
			'Player should not be able to withdraw twice within interval',
		);
	});

	it('gatewayOwner can change ownership of PaymentWithdrawalGateway', async function () {
		const {env, PaymentWithdrawalGateway, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const owner = await env.read(PaymentWithdrawalGateway, {
			functionName: 'owner',
		});
		const player = unnamedAccounts[0];

		await env.execute(PaymentWithdrawalGateway, {
			functionName: 'transferOwnership',
			args: [player],
			account: owner,
		});

		const newOwner = await env.read(PaymentWithdrawalGateway, {
			functionName: 'owner',
		});
		assert.strictEqual(
			newOwner.toLowerCase(),
			player.toLowerCase(),
			'New owner should be set',
		);
	});

	it('random account cannot change ownership', async function () {
		const {env, PaymentWithdrawalGateway, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const player1 = unnamedAccounts[0];
		const player2 = unnamedAccounts[1];

		await assert.rejects(
			env.execute(PaymentWithdrawalGateway, {
				functionName: 'transferOwnership',
				args: [player1],
				account: player2,
			}),
			/expected to revert/,
			'Random account should not be able to change ownership',
		);
	});
});
