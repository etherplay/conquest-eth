import {EnvFactory} from './cli.js';
import type {ToolEnvironment} from './types.js';

// Helper function to handle BigInt serialization in JSON.stringify
export function stringifyWithBigInt(obj: any, space?: number): string {
	return JSON.stringify(
		obj,
		(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
		space,
	);
}

/**
 * Create tool environment with sendStatus
 * @template TEnv - Environment properties type
 * @param env - Environment properties to spread into the tool environment
 */
export function createToolEnvironment<TEnv extends Record<string, any>>(
	env: TEnv,
): ToolEnvironment<TEnv> {
	return {
		sendStatus: async (_message: string) => {
			// TODO: Implement progress notifications when sessionId is available
			// For now, this is a no-op since we don't have sessionId in the current architecture
		},
		...env,
	};
}

/**
 * Create a CLI tool environment for executing tools
 * @template TEnv - Environment type passed to tools
 */
export async function createToolEnvironmentFromFactory<TEnv extends Record<string, any>>(
	envFactory: EnvFactory<TEnv>,
): Promise<ToolEnvironment<TEnv>> {
	const env = await envFactory();

	return {
		sendStatus: async (message: string) => {
			console.error(`[Status] ${message}`);
		},
		...env,
	};
}
