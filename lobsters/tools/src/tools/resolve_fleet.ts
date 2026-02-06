import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';

export const resolve_fleet = createTool({
	description:
		'Resolve a previously sent fleet. This must be called after the fleet arrival time + resolve window to reveal the destination and secret.',
	schema: z.object({
		fleetId: z.string().describe('Fleet ID to resolve'),
	}),
	execute: async (env, {fleetId}) => {
		try {
			const result = await env.fleetManager.resolve(fleetId);

			if (result.resolved) {
				return {
					success: true,
					result: {
						fleetId: result.fleet.fleetId,
						fromPlanetId: result.fleet.fromPlanetId,
						toPlanetId: result.fleet.toPlanetId,
						quantity: result.fleet.quantity,
					},
				};
			} else {
				return {
					success: false,
					error: result.reason,
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});
