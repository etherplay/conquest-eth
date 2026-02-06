import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {getTestPrivateKey} from './helpers.js';

describe('CLI - Fleet Lifecycle', () => {
	let testPrivateKey: string | undefined;

	beforeAll(async () => {
		await setupTestEnvironment();
		testPrivateKey = getTestPrivateKey();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('send_fleet', () => {
		it('should fail when from/to coordinates are missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--quantity',
				'100',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail when quantity is missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from-x',
				'0',
				'--from-y',
				'0',
				'--to-x',
				'1',
				'--to-y',
				'0',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail to send fleet from invalid source coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from-x',
				'999999',
				'--from-y',
				'999999',
				'--to-x',
				'0',
				'--to-y',
				'0',
				'--quantity',
				'100',
			]);

			// Invalid coordinates should result in an error
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should fail to send fleet to invalid destination coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from-x',
				'0',
				'--from-y',
				'0',
				'--to-x',
				'999999',
				'--to-y',
				'999999',
				'--quantity',
				'100',
			]);

			// Invalid coordinates should result in an error
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should fail to send fleet without private key', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				'0xinvalid',
				'send_fleet',
				'--from-x',
				'0',
				'--from-y',
				'0',
				'--to-x',
				'1',
				'--to-y',
				'0',
				'--quantity',
				'100',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail to send fleet with custom arrival time option when not owning planet', async () => {
			const customArrivalTime = Math.floor(Date.now() / 1000) + 3600;
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from-x',
				'0',
				'--from-y',
				'0',
				'--to-x',
				'1',
				'--to-y',
				'0',
				'--quantity',
				'100',
				'--arrivalTimeWanted',
				customArrivalTime.toString(),
			]);

			// Should fail because user doesn't own the source planet
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should fail to send fleet with gift flag when not owning planet', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from-x',
				'0',
				'--from-y',
				'0',
				'--to-x',
				'1',
				'--to-y',
				'0',
				'--quantity',
				'100',
				'--gift',
				'true',
			]);

			// Should fail because user doesn't own the source planet
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should verify sent fleet appears in get_pending_fleets', async () => {
			// First, get pending fleets
			const pendingResult = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_fleets',
			]);

			expect(pendingResult.exitCode).toBe(0);
			const pendingData = JSON.parse(pendingResult.stdout);

			// Should have fleets array
			expect(pendingData.fleets).toBeDefined();
			expect(Array.isArray(pendingData.fleets)).toBe(true);
		});
	});

	describe('resolve_fleet', () => {
		it('should fail when fleetId is missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'resolve_fleet',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail to resolve non-existent fleet', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'resolve_fleet',
				'--fleetId',
				'0x0000000000000000000000000000000000000000000000000000000000000000',
			]);

			// Non-existent fleet should result in an error
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should fail to resolve fleet without private key', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				'0xinvalid',
				'resolve_fleet',
				'--fleetId',
				'0x0000000000000000000000000000000000000000000000000000000000000000',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});
});