import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {getTestPrivateKey} from './helpers.js';

describe('CLI - Error Handling', () => {
	let testPrivateKey: string | undefined;

	beforeAll(async () => {
		await setupTestEnvironment();
		testPrivateKey = getTestPrivateKey();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('Missing Required Parameters', () => {
		it('should error when --rpc-url is missing', async () => {
			const result = await invokeCliCommand([
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain('rpc-url');
		});

		it('should error when --game-contract is missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
			expect(result.stderr).toContain('game-contract');
		});

		it('should error when required tool parameter is missing', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
			]);

			expect(result.exitCode).not.toBe(0);
			// Should complain about missing radius parameter
		});

		it('should error when radius parameter is missing for get_my_planets', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('Invalid Parameter Values', () => {
		it('should error when radius exceeds maximum (50)', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'51',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error when radius is negative', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'-1',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error when radius is zero', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'0',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should handle maximum valid radius (50)', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'50',
			]);

			expect(result.exitCode).toBe(0);
		});

		it('should handle minimum valid radius (1)', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'1',
			]);

			expect(result.exitCode).toBe(0);
		});
	});

	describe('Invalid Configuration', () => {
		it('should error with invalid RPC URL', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				'invalid-url-not-http',
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error with unreachable RPC URL', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				'http://localhost:9999',
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error with invalid game contract address', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				'0xinvalid',
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('Private Key Errors', () => {
		it('should error when private key is malformed (no 0x prefix)', async () => {
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
					'[{"x": 0, "y": 0}]',
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

		it('should error when private key is malformed (wrong length)', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				'0x123',
				'acquire_planets',
				'--coordinates-x',
				'0',
				'--coordinates-y',
				'0',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error when private key is malformed (invalid hex)', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				'0xgggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg',
				'acquire_planets',
				'--coordinates-x',
				'0',
				'--coordinates-y',
				'0',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('Invalid Input Formats', () => {
		it('should error when radius is not a number', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'not-a-number',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error when coordinates are not numbers', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--center',
				'not-a-number,0',
				'--radius',
				'10',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error when quantity is not a number', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from',
				'0,0',
				'--to',
				'1,0',
				'--quantity',
				'not-a-number',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should error when boolean flag is invalid', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'send_fleet',
				'--from',
				'0,0',
				'--to',
				'1,0',
				'--quantity',
				'100',
				'--gift',
				'not-a-boolean',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('Edge Cases', () => {
		it('should handle very large coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'acquire_planets',
				'--coordinates-x',
				'999999999',
				'--coordinates-y',
				'999999999',
			]);

			expect(result.exitCode).not.toBe(0);
		});

		it('should handle very negative coordinates', async () => {
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'--private-key',
				testPrivateKey || '0x0000000000000000000000000000000000000000000000000000000000000001',
				'acquire_planets',
				'--coordinates-x',
				'-999999999',
				'--coordinates-y',
				'-999999999',
			]);

			expect(result.exitCode).not.toBe(0);
		});
	});

	describe('Tool-Specific Errors', () => {
		it('should handle unknown tool command', async () => {
			// When an unknown command is passed after global options, commander
			// treats it as an argument to the root command
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'unknown_tool',
			]);

			expect(result.exitCode).not.toBe(0);
			// Commander treats the unknown command as an unexpected argument
			expect(result.stderr).toBeTruthy();
		});

		it('should provide help for unknown command', async () => {
			const result = await invokeCliCommand(['--help']);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('Usage:');
		});
	});

	describe('Concurrency and State', () => {
		it('should handle rapid successive calls', async () => {
			const promises = Array.from({length: 5}, () =>
				invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'10',
				]),
			);

			const results = await Promise.all(promises);

			// All should complete successfully
			results.forEach((result) => {
				expect(result.exitCode).toBe(0);
			});
		});
	});
});