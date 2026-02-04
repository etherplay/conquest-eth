import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {FleetManager} from '../fleet/manager.js';

/**
 * Tool handler for getting pending fleets
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
