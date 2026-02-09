import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {getTestPrivateKey, assertCliError} from './helpers.js';

/**
 * Tests for write operations (acquire_planets, exit_planets, etc.)
 * These operations require a private key which is passed via PRIVATE_KEY env var.
 */
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
			const result = await invokeCliCommand(
				['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'acquire_planets'],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should complain about missing coordinates parameter
			const output = result.stderr + result.stdout;
			expect(output.toLowerCase()).toMatch(/coordinates|required/);
		});

		it('should fail to acquire planet at invalid coordinates', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'999999,999999',
				],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because planet doesn't exist at these coordinates
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});

		it('should return error when private key is invalid', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'0,0',
				],
				{
					env: {
						PRIVATE_KEY: '0xinvalid',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
		});

		it('should support multiple coordinates with spaces', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'0,0 1,1',
				],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because planets don't exist, but parsing should succeed
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr + result.stdout;
			// Should not fail with coordinate parsing error
			expect(output).not.toContain('Invalid coordinate');
		});

		it('should support negative coordinates', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'-5,-10',
				],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because planet doesn't exist, but parsing should succeed
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr + result.stdout;
			// Should not fail with coordinate parsing error
			expect(output).not.toContain('Invalid coordinate');
		});
	});

	describe('exit_planets', () => {
		it('should fail when coordinates are missing', async () => {
			const result = await invokeCliCommand(
				['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'exit_planets'],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should complain about missing coordinates parameter
			const output = result.stderr + result.stdout;
			expect(output.toLowerCase()).toMatch(/coordinates|required/);
		});

		it('should fail to exit planet at invalid coordinates', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'exit_planets',
					'--coordinates',
					'999999,999999',
				],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because planet doesn't exist at these coordinates
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr || result.stdout;
			expect(output).toBeTruthy();
		});

		it('should support negative coordinates', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'exit_planets',
					'--coordinates',
					'-3,-4',
				],
				{
					env: {
						PRIVATE_KEY: testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
					},
				},
			);

			// Should fail because planet doesn't exist, but parsing should succeed
			expect(result.exitCode).not.toBe(0);
			const output = result.stderr + result.stdout;
			// Should not fail with coordinate parsing error
			expect(output).not.toContain('Invalid coordinate');
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
