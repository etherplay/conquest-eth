import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';

/**
 * Tool handler for exiting planets
 */
export async function handleExitPlanets(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = z
			.object({
				planetIds: z.array(z.union([z.string(), z.number()])),
			})
			.parse(args);
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
					text: JSON.stringify(
						{
							success: true,
							transactionHash: result.hash,
							exitsInitiated: result.exitsInitiated.map((id) => id.toString()),
						},
						null,
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
					text: JSON.stringify(
						{
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
						null,
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
export const exitPlanetsSchema = {
	planetIds: z
		.array(z.union([z.string(), z.number()]))
		.describe('Array of planet location IDs to exit (as hex strings or numbers)'),
};
