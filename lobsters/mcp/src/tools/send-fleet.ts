import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {FleetManager} from '../fleet/manager.js';

/**
 * Tool handler for sending fleet
 * Handles the MCP tool request to send a fleet from one planet to another
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param fleetManager - The FleetManager instance to perform the fleet send
 * @returns The tool result with fleet details, or error details
 */
export async function handleSendFleet(
	args: unknown,
	fleetManager: FleetManager,
): Promise<CallToolResult> {
	try {
		const parsed = sendFleetSchema.parse(args);
		const {fromPlanetId, toPlanetId, quantity, arrivalTimeWanted, gift, specific} = parsed;

		const result = await fleetManager.send(
			typeof fromPlanetId === 'string' ? BigInt(fromPlanetId) : BigInt(fromPlanetId),
			typeof toPlanetId === 'string' ? BigInt(toPlanetId) : BigInt(toPlanetId),
			quantity,
			{
				arrivalTimeWanted:
					typeof arrivalTimeWanted === 'undefined' ? undefined : BigInt(arrivalTimeWanted),
				gift: gift ?? false,
				specific: (specific as `0x${string}`) ?? '0x',
			},
		);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							fleetId: result.fleetId,
							fromPlanetId: result.fromPlanetId.toString(),
							toPlanetId: result.toPlanetId.toString(),
							quantity: result.quantity,
							arrivalTimeWanted: result.arrivalTimeWanted.toString(),
							secret: result.secret,
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
 * Tool schema for sending fleet (ZodRawShapeCompat format)
 */
export const sendFleetSchema = z.object({
	fromPlanetId: z
		.union([z.string(), z.bigint()])
		.describe('Source planet location ID (as string or bigint)'),
	toPlanetId: z
		.union([z.string(), z.bigint()])
		.describe('Destination planet location ID (as string or bigint)'),
	quantity: z.number().describe('Number of spaceships to send'),
	arrivalTimeWanted: z
		.number()
		.optional()
		.describe(
			'Desired arrival time (timestamp in seconds). If not specified, will be calculated based on distance.',
		),
	gift: z
		.boolean()
		.optional()
		.describe('Whether the fleet is a gift (sent without requiring arrival)'),
	specific: z.string().optional().describe('Additional specific data for the fleet'),
});
