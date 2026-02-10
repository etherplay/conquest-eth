/**
 * Test Utilities
 *
 * Common utility functions for test files including:
 * - Blockchain time manipulation
 * - Storage management
 * - CLI invocation helpers
 */

import {promises as fs} from 'node:fs';
import {invokeCliCommand} from './cli-utils.js';

// Default test storage path
export const DEFAULT_TEST_STORAGE_PATH = './data/test';

/**
 * Helper to advance blockchain time using anvil's evm_setNextBlockTimestamp
 */
export async function advanceTime(rpcUrl: string, seconds: number): Promise<void> {
	const currentBlock: any = await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBlockByNumber',
			params: ['latest', false],
			id: 1,
		}),
	}).then((res) => res.json());

	const currentTimestamp = parseInt(currentBlock.result.timestamp, 16);
	const newTimestamp = currentTimestamp + seconds;

	// Set the next block timestamp
	await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'evm_setNextBlockTimestamp',
			params: [newTimestamp],
			id: 2,
		}),
	});

	// Mine a block to apply the timestamp
	await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'evm_mine',
			params: [],
			id: 3,
		}),
	});

	// Verify the new block has the expected timestamp
	const newBlock: any = await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBlockByNumber',
			params: ['latest', false],
			id: 4,
		}),
	}).then((res) => res.json());

	const actualTimestamp = parseInt(newBlock.result.timestamp, 16);
	if (actualTimestamp < newTimestamp) {
		console.warn(
			`Warning: Block timestamp ${actualTimestamp} is less than expected ${newTimestamp}`,
		);
	}
}

/**
 * Helper to get current blockchain timestamp
 */
export async function getCurrentTimestamp(rpcUrl: string): Promise<number> {
	const response = await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBlockByNumber',
			params: ['latest', false],
			id: 1,
		}),
	});
	const result: any = await response.json();
	return parseInt(result.result.timestamp, 16);
}

/**
 * Helper to clear test storage directory
 */
export async function clearTestStorage(
	storagePath: string = DEFAULT_TEST_STORAGE_PATH,
): Promise<void> {
	try {
		await fs.rm(storagePath, {recursive: true, force: true});
	} catch {
		// Ignore if directory doesn't exist
	}
	await fs.mkdir(storagePath, {recursive: true});
}

/**
 * Helper to invoke CLI with test storage path
 */
export async function invokeWithStorage(
	args: string[],
	options?: {env?: Record<string, string>},
	storagePath: string = DEFAULT_TEST_STORAGE_PATH,
): ReturnType<typeof invokeCliCommand> {
	return invokeCliCommand(['--storage-path', storagePath, ...args], options);
}
