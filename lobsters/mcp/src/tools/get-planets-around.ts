import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';
import {stringifyWithBigInt} from '../helpers/index.js';

/**
 * Tool handler for getting planets around
 * Handles the MCP tool request to retrieve planets within a specific radius of a center point
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param planetManager - The PlanetManager instance to query planets
 * @returns The tool result with list of planets in the specified area, or error details
 */
export async function handleGetPlanetsAround(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = getPlanetsAroundSchema.parse(args);
		const {centerX, centerY, radius} = parsed;

		const planets = await planetManager.getPlanetsAround(centerX, centerY, radius);

		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: true,
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
					text: stringifyWithBigInt(
						{
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
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
export const getPlanetsAroundSchema = z.object({
	centerX: z.number().describe('X coordinate of the center point'),
	centerY: z.number().describe('Y coordinate of the center point'),
	radius: z.number().max(50).describe('Radius in distance units to search around the center point'),
});
