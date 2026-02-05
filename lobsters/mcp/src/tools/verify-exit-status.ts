import {z} from 'zod';
import {createTool} from '../types.js';

export const verify_exit_status = createTool({
	description:
		"Check and update the status of a planet's exit operation. Verifies if the exit has completed or been interrupted.",
	schema: z.object({
		planetId: z
			.union([z.string(), z.number()])
			.describe('Planet location ID to verify (as hex string or number)'),
	}),
	execute: async (env, {planetId}) => {
		try {
			const result = await env.planetManager.verifyExitStatus(
				typeof planetId === 'string' ? BigInt(planetId) : BigInt(planetId),
			);

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