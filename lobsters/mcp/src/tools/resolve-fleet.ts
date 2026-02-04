import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {FleetManager} from '../fleet/manager.js';

/**
 * Tool handler for resolving fleet
 */
export async function handleResolveFleet(
	args: unknown,
	fleetManager: FleetManager,
): Promise<CallToolResult> {
	try {
		const parsed = z
			.object({
				fleetId: z.string(),
			})
			.parse(args);
		const {fleetId} = parsed;

		const result = await fleetManager.resolve(fleetId);

		if (result.resolved) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								success: true,
								fleetId: result.fleet.fleetId,
								fromPlanetId: result.fleet.fromPlanetId.toString(),
								toPlanetId: result.fleet.toPlanetId.toString(),
								quantity: result.fleet.quantity,
							},
							null,
							2,
						),
					},
				],
			};
		} else {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								success: false,
								reason: result.reason,
							},
							null,
							2,
						),
					},
				],
				isError: true,
			};
		}
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
 * Tool schema for resolving fleet (ZodRawShapeCompat format)
 */
export const resolveFleetSchema = {
	fleetId: z.string().describe('Fleet ID to resolve'),
};
