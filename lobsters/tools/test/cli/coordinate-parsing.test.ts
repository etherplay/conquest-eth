import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';

/**
 * Tests for coordinate array parsing with various formats.
 * These tests verify that the CLI correctly parses coordinate strings
 * in different formats. The actual commands may fail due to planets
 * not existing, but the parsing should succeed.
 *
 * Key formats tested:
 * - Single coordinate: "x,y"
 * - Multiple coordinates with spaces: "x1,y1 x2,y2"
 * - Multiple coordinates all commas: "x1,y1,x2,y2"
 * - Mixed format: "x1,y1, x2,y2"
 * - Negative coordinates: "-3,4" or "2,-5"
 */
describe('CLI - Coordinate Parsing', () => {
	// Use a test private key for write operations
	const testPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000001';

	beforeAll(async () => {
		await setupTestEnvironment();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('Single Coordinate Parsing', () => {
		it('should parse single positive coordinate "2,5"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'2,5',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing succeeds even if command fails due to planet not existing
			// Error message should mention "planet" or coordinates, not "Invalid coordinate"
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse single negative x coordinate "-3,4"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'-3,4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse single negative y coordinate "2,-5"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'2,-5',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse single coordinate with both negative values "-10,-20"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'-10,-20',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});
	});

	describe('Multiple Coordinates - Space Separated', () => {
		it('should parse space-separated coordinates "2,5 -3,4"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'2,5 -3,4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed (command may fail due to planets not existing)
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse space-separated coordinates with multiple negative values "-1,-2 -3,-4"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'-1,-2 -3,-4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse three space-separated coordinates "1,2 3,4 5,6"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'1,2 3,4 5,6',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});
	});

	describe('Multiple Coordinates - All Commas', () => {
		it('should parse all-comma format "2,5,-3,4"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'2,5,-3,4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse all-comma format with three coordinates "1,2,3,4,5,6"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'1,2,3,4,5,6',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});
	});

	describe('Multiple Coordinates - Mixed Format', () => {
		it('should parse mixed format "2,5, -3,4" (comma-space between tuples)', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'2,5, -3,4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse mixed format "1,2,3,4, 5,6" (partial space separation)', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'1,2,3,4, 5,6',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});
	});

	describe('Edge Cases', () => {
		it('should parse coordinates with extra spaces "  2,5   -3,4  "', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'  2,5   -3,4  ',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse zero coordinates "0,0"', async () => {
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
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});
	});

	describe('Invalid Coordinate Formats', () => {
		it('should error for odd number of values "1,2,3"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'1,2,3',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should contain an error about invalid coordinate count (may be in stdout or stderr)
			const output = result.stderr + result.stdout;
			expect(output).toContain('Invalid coordinate count');
		});

		it('should error for non-numeric values "abc,def"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'abc,def',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should contain an error about invalid coordinate value (may be in stdout or stderr)
			const output = result.stderr + result.stdout;
			expect(output).toContain('not a number');
		});

		it('should error for mixed valid/invalid values "1,2,abc,def"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'1,2,abc,def',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should contain an error about invalid coordinate value (may be in stdout or stderr)
			const output = result.stderr + result.stdout;
			expect(output).toContain('not a number');
		});

		it('should error for single value "5"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					'5',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			expect(result.exitCode).not.toBe(0);
			// Should contain an error about invalid coordinate count (may be in stdout or stderr)
			const output = result.stderr + result.stdout;
			expect(output).toContain('Invalid coordinate count');
		});
	});

	describe('Exit Planets Coordinate Parsing', () => {
		it('should parse exit_planets coordinates with space format "2,5 -3,4"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'exit_planets',
					'--coordinates',
					'2,5 -3,4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed (command may fail due to planets not existing)
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});

		it('should parse exit_planets coordinates with all-comma format "2,5,-3,4"', async () => {
			const result = await invokeCliCommand(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'exit_planets',
					'--coordinates',
					'2,5,-3,4',
				],
				{
					env: {PRIVATE_KEY: testPrivateKey},
				},
			);

			// Parsing should succeed
			const output = result.stderr + result.stdout;
			expect(output).not.toContain('Invalid coordinate format');
			expect(output).not.toContain('Invalid coordinate count');
		});
	});
});
