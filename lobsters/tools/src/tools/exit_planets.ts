import {z} from 'zod';
import {createTool} from '../types.js';

export const exit_planets = createTool({
	description:
		'Exit (unstake) multiple planets to retrieve staked tokens. The exit process takes time and must be completed later.',
	schema: z.object({
		coordinates: z
			.array(
				z.object({
					x: z.number().describe('X coordinate of the planet'),
					y: z.number().describe('Y coordinate of the planet'),
				}),
			)
			.describe('Array of planet coordinates to exit'),
	}),
	execute: async (env, {coordinates}) => {
		try {
			// Convert x,y coordinates to planet IDs
			const planetIdsBigInt: bigint[] = [];
			for (const coord of coordinates) {
				const planetId = env.planetManager.getPlanetIdByCoordinates(coord.x, coord.y);
				if (planetId === undefined) {
					throw new Error(`No planet found at coordinates (${coord.x}, ${coord.y})`);
				}
				planetIdsBigInt.push(planetId);
			}

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
