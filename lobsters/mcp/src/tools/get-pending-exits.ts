import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';
import {stringifyWithBigInt} from '../helpers/index.js';

/**
 * Tool handler for getting pending exits
 * Handles the MCP tool request to retrieve all pending exit (unstake) operations for the current player
 *
 * @param _args - The tool arguments (none required for this tool)
 * @param planetManager - The PlanetManager instance to query pending exits
 * @returns The tool result with list of pending exits, or error details
 */
export async function handleGetPendingExits(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const _parsed = getPendingExitsSchema.parse(args);
		const exits = await planetManager.getMyPendingExits();

		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: true,
							exits: exits.map((exit) => ({
								planetId: exit.planetId,
								player: exit.player,
								exitStartTime: exit.exitStartTime,
								exitDuration: exit.exitDuration,
								exitCompleteTime: exit.exitCompleteTime,
								numSpaceships: exit.numSpaceships,
								owner: exit.owner,
								completed: exit.completed,
								interrupted: exit.interrupted,
								lastCheckedAt: exit.lastCheckedAt,
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
 * Tool schema for getting pending exits (ZodRawShapeCompat format)
 */
export const getPendingExitsSchema = z.object({
	// No properties needed for this tool
});
