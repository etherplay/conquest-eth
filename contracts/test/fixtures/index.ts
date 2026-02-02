// Test fixture utilities using loadAndExecuteDeploymentsFromFiles

import type {Environment} from '../../rocketh/config.js';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {parseEther} from 'viem';

/**
 * Type for a fixture that can be reused across tests
 */
export type FixtureFn<T> = () => Promise<T>;

/**
 * Create a simple fixture that caches its result
 */
export function createFixture<T>(fn: FixtureFn<T>): FixtureFn<T> {
	let cached: T | undefined;
	return async () => {
		if (cached === undefined) {
			cached = await fn();
		}
		return cached;
	};
}

/**
 * Base fixture that loads deployments from files
 */
export const baseFixture = createFixture(async (): Promise<Environment> => {
	return await loadAndExecuteDeploymentsFromFiles();
});