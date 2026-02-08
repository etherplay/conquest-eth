import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';

describe('CLI - Options and Flags', () => {
	beforeAll(async () => {
		await setupTestEnvironment();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('Global Options', () => {
		it('should use global --rpc-url for all commands', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
			const data = JSON.parse(result.stdout);
			expect(data.planets).toBeDefined();
		});

		it('should use global --game-contract for all commands', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
		});

		it('should use global --storage option', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--storage',
				'json',
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
		});

		it('should use global --storage-path option', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--storage-path',
				'./test-data',
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Option Precedence', () => {
		it('should use CLI option over environment variable', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'10',
				],
				{
					env: {
						RPC_URL: 'http://invalid-url',
						GAME_CONTRACT: '0x0000000000000000000000000000000000000000',
					},
				},
			);

			// Should use CLI options, not env vars
			expect(result.exitCode).toBe(0);
		});
	});

	describe('Environment Variable Fallback', () => {
		it('should use RPC_URL environment variable when --rpc-url not provided', async () => {
			const result = await invokeCliCommand(
				['--game-contract', getGameContract(), 'get_my_planets', '--radius', '10'],
				{
					env: {
						RPC_URL,
					},
				},
			);

			expect(result.exitCode).toBe(0);
		});

		it('should use GAME_CONTRACT environment variable when --game-contract not provided', async () => {
			const result = await invokeCliCommand(
				['--rpc-url', RPC_URL, 'get_my_planets', '--radius', '10'],
				{
					env: {
						GAME_CONTRACT: getGameContract(),
					},
				},
			);

			expect(result.exitCode).toBe(0);
		});

		it('should use STORAGE_TYPE environment variable', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'10',
				],
				{
					env: {
						STORAGE_TYPE: 'json',
					},
				},
			);

			expect(result.exitCode).toBe(0);
		});

		it('should use STORAGE_PATH environment variable', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'10',
				],
				{
					env: {
						STORAGE_PATH: './test-env-data',
					},
				},
			);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Option Validation', () => {
		it('should validate --rpc-url format', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				'not-a-valid-url',
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should validate --game-contract format', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				'not-a-valid-address',
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should validate --private-key format (must start with 0x)', async () => {
			// Note: --private-key is not a CLI argument, it's only read from PRIVATE_KEY env var
			// This test verifies that an invalid env var format is rejected
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
						PRIVATE_KEY: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
					},
				},
			);

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain('0x');
		});
	});

	describe('Default Values', () => {
		it('should use default storage type when not specified', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
		});

		it('should use default storage path when not specified', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Option Combinations', () => {
		it('should handle all global options together', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--storage',
				'json',
				'--storage-path',
				'./test-combined',
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Help and Version', () => {
		it('should show help with --help flag', async () => {
			const result = await invokeCliCommand(['--help']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('Usage:');
			expect(result.stdout).toContain('Options:');
			expect(result.stdout).toContain('Commands:');
		});

		it('should show help with -h flag', async () => {
			const result = await invokeCliCommand(['-h']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('Usage:');
		});

		it('should show version with --version flag', async () => {
			const result = await invokeCliCommand(['--version']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
		});

		it('should show version with -V flag', async () => {
			const result = await invokeCliCommand(['-V']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
		});

		it('should show help for specific command', async () => {
			const result = await invokeCliCommand(['get_my_planets', '--help']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('get_my_planets');
		});
	});

	describe('Option Isolation', () => {
		it('should not leak environment variables between tests', {timeout: 10_000}, async () => {
			// First call with custom env
			const result1 = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'10',
				],
				{
					env: {
						CUSTOM_VAR: 'should-not-leak',
					},
				},
			);

			expect(result1.exitCode).toBe(0);

			// Second call without custom env
			const result2 = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result2.exitCode).toBe(0);

			// Results should be consistent
			const data1 = JSON.parse(result1.stdout);
			const data2 = JSON.parse(result2.stdout);

			expect(data1.planets.length).toBe(data2.planets.length);
		});
	});
});
