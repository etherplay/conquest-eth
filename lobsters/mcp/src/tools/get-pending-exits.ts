import {z} from 'zod';
import {createTool} from '../types.js';

export const get_pending_exits = createTool({
	description: 'Get all pending exit (unstake) operations for your planets.',
	schema: z.object({
		// No properties needed for this tool
	}),
	execute: async (env) => {
		try {
			const exits = await env.planetManager.getMyPendingExits();

			return {
				success: true,
				result: {
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
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});