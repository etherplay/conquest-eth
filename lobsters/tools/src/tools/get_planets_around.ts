import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	centerX: z.number().describe('X coordinate of the center point'),
	centerY: z.number().describe('Y coordinate of the center point'),
	radius: z
		.number()
		.max(50)
		.describe('Radius in distance units to search around the center point'),
});

export const get_planets_around = createTool<typeof schema, ConquestEnv>({
	description:
		'Get planets around a specific location within a certain radius. Useful for finding targets for fleet movement.',
	schema,
	execute: async (env, {centerX, centerY, radius}) => {
		try {
			const planets = await env.planetManager.getPlanetsAround(centerX, centerY, radius);

			return {
				success: true,
				result: {
					center: {
						x: centerX,
						y: centerY,
					},
					radius,
					planets: planets.map(({info, state}) => ({
						planetId: info.location.id,
						distance: Math.sqrt(
							Math.pow(info.location.x - centerX, 2) + Math.pow(info.location.y - centerY, 2),
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
