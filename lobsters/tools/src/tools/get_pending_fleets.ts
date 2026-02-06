import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';

export const get_pending_fleets = createTool({
	description: 'Get all pending fleets sent from your planets.',
	schema: z.object({
		// No properties needed for this tool
	}),
	execute: async (env) => {
		try {
			const fleets = await env.fleetManager.getMyPendingFleets();

			return {
				success: true,
				result: {
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
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});
