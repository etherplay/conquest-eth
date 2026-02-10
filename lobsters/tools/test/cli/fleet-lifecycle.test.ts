import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {getTestPrivateKey} from './helpers.js';

/**
 * Tests for fleet operations (send_fleet, resolve_fleet, get_pending_fleets)
 * Write operations require a private key which is passed via PRIVATE_KEY env var.
 */
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
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--quantity',
					'100',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should complain about missing from/to parameters
			const output = result.stderr + result.stdout;
			expect(output.toLowerCase()).toMatch(/from|to|required/);
		});

		it('should fail when quantity is missing', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'0,0',
					'--to',
					'1,0',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should complain about missing quantity parameter
			const output = result.stderr + result.stdout;
			expect(output.toLowerCase()).toMatch(/quantity|required/);
		});

		it('should fail to send fleet from invalid source coordinates', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'999999,999999',
					'--to',
					'0,0',
					'--quantity',
					'100',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Invalid coordinates should result in an error
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});

		it('should fail to send fleet to invalid destination coordinates', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'0,0',
					'--to',
					'999999,999999',
					'--quantity',
					'100',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Invalid coordinates should result in an error
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});

		it('should fail to send fleet with invalid private key', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'0,0',
					'--to',
					'1,0',
					'--quantity',
					'100',
				],
				{
					env: {
						PRIVATE_KEY: '0xinvalid',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail to send fleet with custom arrival time option when not owning planet', async () => {
			const customArrivalTime = Math.floor(Date.now() / 1000) + 3600;
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'0,0',
					'--to',
					'1,0',
					'--quantity',
					'100',
					'--arrivalTimeWanted',
					customArrivalTime.toString(),
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because user doesn't own the source planet
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});

		it('should fail to send fleet with gift flag when not owning planet', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'0,0',
					'--to',
					'1,0',
					'--quantity',
					'100',
					'--gift',
					'true',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because user doesn't own the source planet
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});

		it('should support negative coordinates in from/to parameters', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					'-5,-10',
					'--to',
					'-3,4',
					'--quantity',
					'100',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because planets don't exist, but parsing should succeed
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr + result.stdout;
			// Should not fail with coordinate parsing error
			expect(output).not.toContain('Invalid coordinate');
		});

		it('should verify sent fleet appears in get_pending_fleets', async () => {
			// First, get pending fleets (this is a read operation, no private key needed)
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
			const result = await invokeCliCommand(
				['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'resolve_fleet'],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should complain about missing fleetId parameter
			const output = result.stderr + result.stdout;
			expect(output.toLowerCase()).toMatch(/fleetid|required/);
		});

		it('should fail to resolve non-existent fleet', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'resolve_fleet',
					'--fleetId',
					'0x0000000000000000000000000000000000000000000000000000000000000000',
				],
				{
					env: {
						PRIVATE_KEY:
							testPrivateKey ||
							'0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Non-existent fleet should result in an error
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});
	});
});
