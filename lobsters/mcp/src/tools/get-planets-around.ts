import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';

/**
 * Tool handler for getting planets around
 */
export async function handleGetPlanetsAround(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = z
			.object({
				centerX: z.number(),
				centerY: z.number(),
				radius: z.number(),
			})
			.parse(args);
		const {centerX, centerY, radius} = parsed;

		const planets = await planetManager.getPlanetsAround(centerX, centerY, radius);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							center: {
								x: centerX,
								y: centerY,
							},
							radius,
							planets: planets.map(({info, state}) => ({
								planetId: info.location.id.toString(),
								distance: Math.sqrt(
									Math.pow(info.location.x - centerX, 2) + Math.pow(info.location.y - centerY, 2),
								),
								owner: state?.owner || null,
								location: {
									x: info.location.x,
									y: info.location.y,
								},
								numSpaceships: state?.numSpaceships || 0,
							})),
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
 * Tool schema for getting planets around (ZodRawShapeCompat format)
 */
export const getPlanetsAroundSchema = {
	centerX: z.number().describe('X coordinate of the center point'),
	centerY: z.number().describe('Y coordinate of the center point'),
	radius: z.number().describe('Radius in distance units to search around the center point'),
};
