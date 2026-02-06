/**
 * CLI Test Utilities
 *
 * Utilities for testing CLI invocation using subprocess execution.
 * This approach provides true process isolation and tests the actual CLI
 * as users would experience it.
 */

import {exec} from 'child_process';
import {promisify} from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Result from CLI command execution
 */
export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

/**
 * Options for CLI command invocation
 */
export interface InvokeOptions {
	/**
	 * Environment variables to set for the command
	 */
	env?: Record<string, string>;
	/**
	 * Timeout in milliseconds (default: 30000)
	 */
	timeout?: number;
}

/**
 * Get the path to the CLI entry point
 */
function getCliPath(): string {
	return path.join(process.cwd(), 'src', 'cli.ts');
}

/**
 * Escape shell argument to prevent injection
 */
function escapeArg(arg: string): string {
	// If the argument contains spaces, quotes, or special characters, wrap in quotes
	if (/[\s"'\\$`!]/.test(arg)) {
		// Escape single quotes and wrap in single quotes
		return `'${arg.replace(/'/g, "'\\''")}'`;
	}
	return arg;
}

/**
 * Invoke CLI command with arguments and capture output
 *
 * Uses subprocess execution for true process isolation and realistic testing.
 *
 * @param args - Array of command line arguments
 * @param options - Optional configuration (env vars, timeout)
 * @returns Promise resolving to stdout, stderr, and exit code
 *
 * @example
 * ```ts
 * const { stdout, exitCode } = await invokeCliCommand(['--help']);
 * expect(exitCode).toBe(0);
 * expect(stdout).toContain('Usage:');
 * ```
 *
 * @example
 * ```ts
 * const { stderr, exitCode } = await invokeCliCommand(
 *   ['get_balance', '--address', '0x...'],
 *   { env: { RPC_URL: 'http://localhost:8545' } }
 * );
 * ```
 */
export async function invokeCliCommand(
	args: string[],
	options?: InvokeOptions,
): Promise<CliResult> {
	const cliPath = getCliPath();
	const escapedArgs = args.map(escapeArg).join(' ');
	const cmd = `pnpm tsx ${cliPath} ${escapedArgs}`;

	// Merge environment variables, explicitly clearing ECLI_ and RPC_URL vars
	// unless provided in options.env to ensure test isolation
	const env: Record<string, string | undefined> = {
		...process.env,
		// Clear these by default for test isolation
		ECLI_RPC_URL: undefined,
		ECLI_PRIVATE_KEY: undefined,
		RPC_URL: undefined,
		PRIVATE_KEY: undefined,
	};

	// Apply any env vars from options
	if (options?.env) {
		for (const [key, value] of Object.entries(options.env)) {
			env[key] = value;
		}
	}

	// Remove undefined values (Node's exec doesn't handle them well)
	const cleanEnv: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (value !== undefined) {
			cleanEnv[key] = value;
		}
	}

	try {
		const {stdout, stderr} = await execAsync(cmd, {
			cwd: process.cwd(),
			env: cleanEnv,
			timeout: options?.timeout ?? 30000,
		});
		return {stdout, stderr, exitCode: 0};
	} catch (error: any) {
		// exec throws on non-zero exit codes
		return {
			stdout: error.stdout || '',
			stderr: error.stderr || '',
			exitCode: error.code || 1,
		};
	}
}

/**
 * Setup CLI test environment with environment variables
 *
 * @deprecated Use the `env` option in `invokeCliCommand` instead.
 * This function is kept for backward compatibility but subprocess
 * testing handles environment isolation automatically.
 */
export function setupCliTest(options?: {rpcUrl?: string; privateKey?: string}): {
	restore: () => void;
} {
	const envVars = new Map<string, string | undefined>();

	if (options?.rpcUrl !== undefined) {
		envVars.set('ECLI_RPC_URL', process.env.ECLI_RPC_URL);
		envVars.set('RPC_URL', process.env.RPC_URL);
		process.env.ECLI_RPC_URL = options.rpcUrl;
		process.env.RPC_URL = options.rpcUrl;
	}

	if (options?.privateKey !== undefined) {
		envVars.set('ECLI_PRIVATE_KEY', process.env.ECLI_PRIVATE_KEY);
		envVars.set('PRIVATE_KEY', process.env.PRIVATE_KEY);
		process.env.ECLI_PRIVATE_KEY = options.privateKey;
		process.env.PRIVATE_KEY = options.privateKey;
	}

	const restore = () => {
		for (const [key, value] of envVars) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	};

	return {restore};
}
