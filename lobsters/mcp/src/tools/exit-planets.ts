import {z} from 'zod';
import {createTool} from '../types.js';

export const exit_planets = createTool({
	description:
		'Exit (unstake) multiple planets to retrieve staked tokens. The exit process takes time and must be completed later.',
	schema: z.object({
		planetIds: z
			.array(z.union([z.string(), z.number()]))
			.describe('Array of planet location IDs to exit (as hex strings or numbers)'),
	}),
	execute: async (env, {planetIds}) => {
		try {
			// Convert planet IDs to BigInt
			const planetIdsBigInt = planetIds.map((id) =>
				typeof id === 'string' ? BigInt(id) : BigInt(id),
			);

			const result = await env.planetManager.exit(planetIdsBigInt);

			return {
				success: true,
				result: {
					transactionHash: result.hash,
					exitsInitiated: result.exitsInitiated,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});