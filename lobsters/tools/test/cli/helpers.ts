/**
 * CLI Test Helpers
 *
 * Shared utilities and helper functions for CLI testing.
 * Only contains truly reusable utilities - no CLI operation wrappers.
 */

/**
 * Known planet coordinates for testing
 */
export const TEST_COORDINATES = {
	CENTER: {x: 0, y: 0},
	ADJACENT: [
		{x: 1, y: 0},
		{x: 0, y: 1},
		{x: -1, y: 0},
		{x: 0, y: -1},
	],
	DISTANT: [
		{x: 10, y: 10},
		{x: -10, y: -10},
		{x: 10, y: -10},
		{x: -10, y: 10},
	],
} as const;

/**
 * Parse CLI output as JSON with BigInt support
 */
export function parseCliOutput<T>(output: string): T {
	// BigInt values are already serialized to strings in the CLI output
	return JSON.parse(output) as T;
}

/**
 * Assert that a CLI command succeeded
 */
export function assertCliSuccess(
	result: {exitCode: number; stdout: string; stderr: string},
	message?: string,
): void {
	if (result.exitCode !== 0) {
		throw new Error(
			`CLI command failed${message ? `: ${message}` : ''}\nExit code: ${result.exitCode}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`,
		);
	}
}

/**
 * Assert that a CLI command failed with an error
 */
export function assertCliError(
	result: {exitCode: number; stdout: string; stderr: string},
	expectedError?: string,
): void {
	if (result.exitCode === 0) {
		throw new Error(`CLI command succeeded but was expected to fail\nStdout: ${result.stdout}`);
	}
	if (expectedError) {
		try {
			const data = parseCliOutput<{error?: string}>(result.stdout);
			if (!data.error?.includes(expectedError)) {
				throw new Error(
					`Expected error to contain "${expectedError}" but got: ${data.error}\nStdout: ${result.stdout}`,
				);
			}
		} catch (e) {
			// If we can't parse the output, just check stderr
			if (!result.stderr.includes(expectedError) && !result.stdout.includes(expectedError)) {
				throw new Error(
					`Expected error to contain "${expectedError}" but got neither stdout nor stderr containing it\nStdout: ${result.stdout}\nStderr: ${result.stderr}`,
				);
			}
		}
	}
}

/**
 * Check if private key is available for write operations
 */
export function hasPrivateKey(): boolean {
	const privateKey = process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY;
	return privateKey !== undefined && privateKey.startsWith('0x');
}

/**
 * Get test private key from environment or test context
 * Returns undefined if not available - tests should handle this gracefully
 */
export function getTestPrivateKey(): string | undefined {
	const privateKey = process.env.TEST_PRIVATE_KEY || process.env.PRIVATE_KEY;
	if (!privateKey) {
		return undefined;
	}
	if (!privateKey.startsWith('0x')) {
		throw new Error('Private key must start with 0x');
	}
	return privateKey;
}
