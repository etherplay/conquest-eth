import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	radius: z.number().min(1).max(50).describe('Search radius around origin (0,0) to find planets'),
});

export const get_my_planets = createTool<typeof schema, ConquestEnv>({
	description: 'Get all planets owned by the current user address.',
	schema,
	execute: async (env, {radius}) => {
		try {
			const planets = await env.planetManager.getMyPlanets(radius);

			return {
				success: true,
				result: {
					planets: planets.map(({info, state}) => ({
						planetId: info.location.id.toString(),
						location: info.location,
						...state,
					})),
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
