import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';

/**
 * Tool handler for getting my planets
 * Handles the MCP tool request to retrieve all planets owned by the current wallet address
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param planetManager - The PlanetManager instance to query owned planets
 * @returns The tool result with list of owned planets, or error details
 */
export async function handleGetMyPlanets(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = z
			.object({
				radius: z.number().optional(),
			})
			.parse(args);
		const radius = parsed.radius ?? 100;
		const planets = await planetManager.getMyPlanets(radius);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							planets: planets.map(({info, state}) => ({
								planetId: info.location.id.toString(),
								owner: state.owner,
								location: {
									x: info.location.x,
									y: info.location.y,
								},
								numSpaceships: state.numSpaceships,
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
 * Tool schema for getting my planets (ZodRawShapeCompat format)
 */
export const getMyPlanetsSchema = {
	radius: z.number().optional().describe('Search radius around origin (0,0) to find planets'),
};
