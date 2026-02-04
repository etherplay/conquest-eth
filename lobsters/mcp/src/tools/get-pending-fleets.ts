import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {FleetManager} from '../fleet/manager.js';

/**
 * Tool handler for getting pending fleets
 * Handles the MCP tool request to retrieve all pending fleets sent from the current player's planets
 *
 * @param _args - The tool arguments (none required for this tool)
 * @param fleetManager - The FleetManager instance to query pending fleets
 * @returns The tool result with list of pending fleets, or error details
 */
export async function handleGetPendingFleets(
	_args: unknown,
	fleetManager: FleetManager,
): Promise<CallToolResult> {
	try {
		const fleets = await fleetManager.getMyPendingFleets();

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							fleets: fleets.map((fleet) => ({
								fleetId: fleet.fleetId,
								fromPlanetId: fleet.fromPlanetId.toString(),
								toPlanetId: fleet.toPlanetId.toString(),
								quantity: fleet.quantity,
								secret: fleet.secret,
								gift: fleet.gift,
								specific: fleet.specific,
								arrivalTimeWanted: fleet.arrivalTimeWanted.toString(),
								fleetSender: fleet.fleetSender,
								operator: fleet.operator,
								committedAt: fleet.committedAt,
								estimatedArrivalTime: fleet.estimatedArrivalTime,
								resolved: fleet.resolved,
								resolvedAt: fleet.resolvedAt,
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
 * Tool schema for getting pending fleets (ZodRawShapeCompat format)
 */
export const getPendingFleetsSchema = {
	// No properties needed for this tool
};
