import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	x: z.number().describe('X coordinate of the planet'),
	y: z.number().describe('Y coordinate of the planet'),
});

export const verify_exit_status = createTool<typeof schema, ConquestEnv>({
	description:
		"Check and update the status of a planet's exit operation. Verifies if the exit has completed or been interrupted.",
	schema,
	execute: async (env, {x, y}) => {
		try {
			const planetId = env.planetManager.getPlanetIdByCoordinates(x, y);
			if (planetId === undefined) {
				throw new Error(`No planet found at coordinates (${x}, ${y})`);
			}
			const result = await env.planetManager.verifyExitStatus(planetId);

			// Calculate status based on exit state
			const currentTime = Math.floor(Date.now() / 1000);
			const completed = currentTime >= result.exit.exitCompleteTime;
			const status = result.interrupted ? 'interrupted' : completed ? 'completed' : 'in_progress';
			const owner = result.newOwner || result.exit.player;

			return {
				success: true,
				result: {
					planetId: result.exit.planetId,
					status,
					completed,
					interrupted: result.interrupted,
					owner,
					exitStartTime: result.exit.exitStartTime,
					exitCompleteTime: result.exit.exitCompleteTime,
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
