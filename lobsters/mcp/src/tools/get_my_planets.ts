import {z} from 'zod';
import {createTool} from '../types.js';

export const get_my_planets = createTool({
	description: 'Get all planets owned by the current user address.',
	schema: z.object({
		radius: z.number().max(50).describe('Search radius around origin (0,0) to find planets'),
	}),
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