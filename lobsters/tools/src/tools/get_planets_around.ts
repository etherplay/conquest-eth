import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';

export const get_planets_around = createTool({
	description:
		'Get planets around a specific location within a certain radius. Useful for finding targets for fleet movement.',
	schema: z.object({
		centerX: z.number().describe('X coordinate of the center point'),
		centerY: z.number().describe('Y coordinate of the center point'),
		radius: z
			.number()
			.max(50)
			.describe('Radius in distance units to search around the center point'),
	}),
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
