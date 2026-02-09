import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	coordinates: z
		.array(
			z.object({
				x: z.number().describe('X coordinate of the planet'),
				y: z.number().describe('Y coordinate of the planet'),
			}),
		)
		.describe('Array of planet coordinates to withdraw tokens from (must have completed exits)'),
});

export const withdraw = createTool<typeof schema, ConquestEnv>({
	description:
		'Withdraw staked tokens from planets that have completed their exit process. Call this after the exit waiting period is complete to claim your tokens.',
	schema,
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

			// Call withdraw method
			const result = await env.planetManager.withdraw(planetIdsBigInt);

			return {
				success: true,
				result: {
					transactionHash: result.hash,
					coordinates: coordinates,
					planetsWithdrawn: result.planetsWithdrawn.map((id) => id.toString()),
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
