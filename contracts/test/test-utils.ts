// Test utilities using hardhat-network-helpers and native assertions
import assert from 'node:assert';

/**
 * Expect a transaction to revert with an optional expected message
 */
export async function expectRevert(
	promise: Promise<unknown>,
	expectedMessage?: string,
): Promise<boolean> {
	try {
		await promise;
		assert.fail('Expected transaction to revert');
	} catch (error) {
		// @ts-expect-error - error has message property
		const errorMessage = error?.message || String(error);
		if (expectedMessage) {
			assert(
				errorMessage.includes(expectedMessage),
				`Expected revert message to include "${expectedMessage}", got: "${errorMessage}"`,
			);
		}
		return true;
	}
}

/**
 * Increase time by given number of seconds (requires networkHelpers from test)
 */
export async function increaseTime(
	networkHelpers: {time: {increase: (seconds: number) => Promise<number>}},
	numSec: number,
): Promise<void> {
	await networkHelpers.time.increase(numSec);
}

/**
 * Get the current timestamp (requires networkHelpers from test)
 */
export async function getTime(networkHelpers: {
	time: {latest: () => Promise<number>};
}): Promise<bigint> {
	const timestamp = await networkHelpers.time.latest();
	return BigInt(timestamp);
}

/**
 * Map object values using a function
 * Helper utility for transforming contract call data
 */
export function objMap<T>(
	obj: Record<string, T>,
	func: (item: T, index: number) => T,
	options?: {
		depth: number;
	},
): Record<string, T> {
	const newObj: Record<string, T> = {};
	Object.keys(obj).map(function (key, index) {
		const keyAsNumber = parseInt(key, 10);
		if (Number.isNaN(keyAsNumber) || keyAsNumber >= (obj as any).length) {
			let item = obj[key];
			if (
				options &&
				options.depth > 0 &&
				typeof item === 'object' &&
				item !== null
			) {
				item = objMap(item as any, func, {depth: options.depth - 1}) as T;
			} else {
				item = func(item, index);
			}
			newObj[key] = item;
		}
	});
	return newObj;
}

// Common constants
export const zeroAddress = '0x0000000000000000000000000000000000000000';
export const emptyBytes = '0x';
