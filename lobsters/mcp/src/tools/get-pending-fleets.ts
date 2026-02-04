import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {FleetManager} from '../fleet/manager.js';
import z from 'zod';
import {stringifyWithBigInt} from '../helpers/index.js';

/**
 * Tool handler for getting pending fleets
 * Handles the MCP tool request to retrieve all pending fleets sent from the current player's planets
 *
 * @param _args - The tool arguments (none required for this tool)
 * @param fleetManager - The FleetManager instance to query pending fleets
 * @returns The tool result with list of pending fleets, or error details
 */
export async function handleGetPendingFleets(
	args: unknown,
	fleetManager: FleetManager,
): Promise<CallToolResult> {
	try {
		const _parsed = getPendingFleetsSchema.parse(args);
		const fleets = await fleetManager.getMyPendingFleets();

		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: true,
							fleets: fleets.map((fleet) => ({
								fleetId: fleet.fleetId,
								fromPlanetId: fleet.fromPlanetId,
								toPlanetId: fleet.toPlanetId,
								quantity: fleet.quantity,
								secret: fleet.secret,
								gift: fleet.gift,
								specific: fleet.specific,
								arrivalTimeWanted: fleet.arrivalTimeWanted,
								fleetSender: fleet.fleetSender,
								operator: fleet.operator,
								committedAt: fleet.committedAt,
								estimatedArrivalTime: fleet.estimatedArrivalTime,
								resolved: fleet.resolved,
								resolvedAt: fleet.resolvedAt,
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
 * Tool schema for getting pending fleets (ZodRawShapeCompat format)
 */
export const getPendingFleetsSchema = z.object({
	// No properties needed for this tool
});
