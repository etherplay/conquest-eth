import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';
import {stringify} from 'node:querystring';
import {stringifyWithBigInt} from '../helpers/index.js';

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
		const parsed = getMyPlanetsSchema.parse(args);
		const radius = parsed.radius;
		const planets = await planetManager.getMyPlanets(radius);

		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: true,
							planets: planets.map(({info, state}) => ({
								planetId: info.location.id.toString(),
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
 * Tool schema for getting my planets (ZodRawShapeCompat format)
 */
export const getMyPlanetsSchema = z.object({
	radius: z.number().max(50).describe('Search radius around origin (0,0) to find planets'),
});
