import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {getTestPrivateKey, assertCliSuccess, assertCliError} from './helpers.js';

describe('CLI - Write Operations', () => {
	let testPrivateKey: string | undefined;

	beforeAll(async () => {
		await setupTestEnvironment();
		testPrivateKey = getTestPrivateKey();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('acquire_planets', () => {
		it('should fail when coordinates are missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'acquire_planets',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail to acquire planet at invalid coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'acquire_planets',
				'--coordinates',
				'999999,999999',
			]);

			// Should fail because planet doesn't exist at these coordinates
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should return error when private key is missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				'0xinvalid',
				'acquire_planets',
				'--coordinates',
				'0,0',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('exit_planets', () => {
		it('should fail when coordinates are missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'exit_planets',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should fail to exit planet at invalid coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'exit_planets',
				'--coordinates',
				'999999,999999',
			]);

			// Should fail because planet doesn't exist at these coordinates
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should return error when private key is missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				'0xinvalid',
				'exit_planets',
				'--coordinates',
				'0,0',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('verify_exit_status', () => {
		it('should handle verifying planet exit status', async () => {
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
				expect(data).toHaveProperty('status');
				expect(['in_progress', 'completed', 'interrupted']).toContain(data.status);
			} else {
				// Planet might not have an exit
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

			assertCliError(result, 'No planet found');
		});
	});
});