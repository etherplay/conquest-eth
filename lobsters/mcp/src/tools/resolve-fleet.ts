import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {FleetManager} from '../fleet/manager.js';
import {stringifyWithBigInt} from '../helpers/index.js';

/**
 * Tool handler for resolving fleet
 * Handles the MCP tool request to resolve (reveal) a previously sent fleet
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param fleetManager - The FleetManager instance to perform the resolution
 * @returns The tool result with resolved fleet details or reason for failure
 */
export async function handleResolveFleet(
	args: unknown,
	fleetManager: FleetManager,
): Promise<CallToolResult> {
	try {
		const parsed = resolveFleetSchema.parse(args);
		const {fleetId} = parsed;

		const result = await fleetManager.resolve(fleetId);

		if (result.resolved) {
			return {
				content: [
					{
						type: 'text',
						text: stringifyWithBigInt(
							{
								success: true,
								fleetId: result.fleet.fleetId,
								fromPlanetId: result.fleet.fromPlanetId,
								toPlanetId: result.fleet.toPlanetId,
								quantity: result.fleet.quantity,
							},
							2,
						),
					},
				],
			};
		} else {
			return {
				content: [
					{
						type: 'text',
						text: stringifyWithBigInt(
							{
								success: false,
								reason: result.reason,
							},
							2,
						),
					},
				],
				isError: true,
			};
		}
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
 * Tool schema for resolving fleet (ZodRawShapeCompat format)
 */
export const resolveFleetSchema = z.object({
	fleetId: z.string().describe('Fleet ID to resolve'),
});
