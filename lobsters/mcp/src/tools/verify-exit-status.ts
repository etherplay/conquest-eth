import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';

/**
 * Tool handler for verifying exit status
 */
export async function handleVerifyExitStatus(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = z
			.object({
				planetId: z.union([z.string(), z.number()]),
			})
			.parse(args);
		const {planetId} = parsed;

		const result = await planetManager.verifyExitStatus(
			typeof planetId === 'string' ? BigInt(planetId) : BigInt(planetId),
		);

		// Calculate status based on exit state
		const currentTime = Math.floor(Date.now() / 1000);
		const completed = currentTime >= result.exit.exitCompleteTime;
		const status = result.interrupted ? 'interrupted' : completed ? 'completed' : 'in_progress';
		const owner = result.newOwner || result.exit.player;

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							planetId: result.exit.planetId.toString(),
							status,
							completed,
							interrupted: result.interrupted,
							owner,
							exitStartTime: result.exit.exitStartTime,
							exitCompleteTime: result.exit.exitCompleteTime,
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
 * Tool schema for verifying exit status (ZodRawShapeCompat format)
 */
export const verifyExitStatusSchema = {
	planetId: z
		.union([z.string(), z.number()])
		.describe('Planet location ID to verify (as hex string or number)'),
};
