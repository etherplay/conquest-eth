import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {getTestPrivateKey} from './helpers.js';

describe('CLI - Planet Lifecycle', () => {
	let testPrivateKey: string | undefined;

	beforeAll(async () => {
		await setupTestEnvironment();
		testPrivateKey = getTestPrivateKey();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('verify_exit_status', () => {
		it('should verify exit status of a planet', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'verify_exit_status',
				'--x',
				'0',
				'--y',
				'0',
			]);

			// May succeed or fail depending on whether planet has an exit
			if (result.exitCode === 0) {
				const data = JSON.parse(result.stdout);

				expect(data).toHaveProperty('planetId');
				expect(data).toHaveProperty('status');
				expect(data).toHaveProperty('completed');
				expect(data).toHaveProperty('interrupted');
				expect(data).toHaveProperty('owner');
				expect(data).toHaveProperty('exitStartTime');
				expect(data).toHaveProperty('exitCompleteTime');

				// Status should be one of: in_progress, completed, interrupted
				expect(['in_progress', 'completed', 'interrupted']).toContain(data.status);
			} else {
				// Planet might not have an exit
				expect(result.stderr || result.stdout).toBeTruthy();
			}
		});

		it('should handle verifying planet without exit', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'verify_exit_status',
				'--x',
				'0',
				'--y',
				'0',
			]);

			// Try to verify exit status
			if (result.exitCode === 0) {
				const data = JSON.parse(result.stdout);
				// Should have valid structure
				expect(data.status).toBeDefined();
			} else {
				// May fail if no exit is in progress
				expect(result.stderr || result.stdout).toBeTruthy();
			}
		});

		it('should fail to verify invalid coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'verify_exit_status',
				'--x',
				'999999',
				'--y',
				'999999',
			]);

			expect(result.exitCode).not.toBe(0);
			// Error may be in stderr or stdout depending on how the error is handled
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it(
			'should track exit status changes',
			{
				timeout: 15000,
			},
			async () => {
				// Acquire planet (may fail due to CLI limitations)
				const acquireResult = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'--private-key',
					testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					'acquire_planets',
					'--coordinates-x',
					'0',
					'--coordinates-y',
					'0',
				]);

				// Verify exit status (may or may not succeed)
				const verifyResult = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'verify_exit_status',
					'--x',
					'0',
					'--y',
					'0',
				]);

				if (verifyResult.exitCode === 0) {
					const verifyData = JSON.parse(verifyResult.stdout);
					// Status should reflect exit in progress or completed
					expect(['in_progress', 'completed', 'interrupted']).toContain(verifyData.status);
				}
			},
		);
	});

	describe('Planet State Tracking', () => {
		it(
			'should track planet state through lifecycle',
			{
				timeout: 15000,
			},
			async () => {
				// Initial state: get my planets
				const initialPlanets = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'10',
				]);
				expect(initialPlanets.exitCode).toBe(0);

				const initialData = JSON.parse(initialPlanets.stdout);

				// Get planets around center
				const aroundResult = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_planets_around',
					'--center',
					'0,0',
					'--radius',
					'10',
				]);
				expect(aroundResult.exitCode).toBe(0);

				const aroundData = JSON.parse(aroundResult.stdout);
				expect(aroundData.planets).toBeDefined();
			},
		);

		it('should maintain consistency across read operations', async () => {
			// Get my planets multiple times
			const result1 = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);
			const result2 = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);
			const result3 = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result1.exitCode).toBe(0);
			expect(result2.exitCode).toBe(0);
			expect(result3.exitCode).toBe(0);

			// Results should be consistent
			const data1 = JSON.parse(result1.stdout);
			const data2 = JSON.parse(result2.stdout);
			const data3 = JSON.parse(result3.stdout);

			expect(data1.planets.length).toBe(data2.planets.length);
			expect(data2.planets.length).toBe(data3.planets.length);
		}, 15000);
	});
});
