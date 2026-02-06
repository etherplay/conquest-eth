import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	center: z.object({x: z.number(), y: z.number()}).describe('Center point coordinates {x, y}'),
	radius: z
		.number()
		.max(50)
		.describe('Radius in distance units to search around the center point'),
});

export const get_planets_around = createTool<typeof schema, ConquestEnv>({
	description:
		'Get planets around a specific location within a certain radius. Useful for finding targets for fleet movement.',
	schema,
	execute: async (env, {center, radius}) => {
		try {
			const planets = await env.planetManager.getPlanetsAround(center.x, center.y, radius);

			return {
				success: true,
				result: {
					center: {
						x: center.x,
						y: center.y,
					},
					radius,
					planets: planets.map(({info, state}) => ({
						planetId: info.location.id,
						distance: Math.sqrt(
							Math.pow(info.location.x - center.x, 2) + Math.pow(info.location.y - center.y, 2),
						),
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
