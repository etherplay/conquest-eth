import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';
import {stringifyWithBigInt} from '../helpers/index.js';

/**
 * Tool handler for exiting planets
 * Handles the MCP tool request to exit (unstake) multiple planets to retrieve staked tokens
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param planetManager - The PlanetManager instance to perform the exit
 * @returns The tool result with transaction hash and exited planet IDs, or error details
 */
export async function handleExitPlanets(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = exitPlanetsSchema.parse(args);
		const {planetIds} = parsed;

		// Convert planet IDs to BigInt
		const planetIdsBigInt = planetIds.map((id) =>
			typeof id === 'string' ? BigInt(id) : BigInt(id),
		);

		const result = await planetManager.exit(planetIdsBigInt);

		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: true,
							transactionHash: result.hash,
							exitsInitiated: result.exitsInitiated,
						},
						2,
					),
				},
			],
		};
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
						2,
					),
				},
			],
			isError: true,
		};
	}
}

/**
 * Tool schema for exiting planets (ZodRawShapeCompat format)
 */
export const exitPlanetsSchema = z.object({
	planetIds: z
		.array(z.union([z.string(), z.number()]))
		.describe('Array of planet location IDs to exit (as hex strings or numbers)'),
});
