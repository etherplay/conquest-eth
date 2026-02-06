import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	// No properties needed for this tool
});

export const get_pending_exits = createTool<typeof schema, ConquestEnv>({
	description: 'Get all pending exit (unstake) operations for your planets.',
	schema,
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
