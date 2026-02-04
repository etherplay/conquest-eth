import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {FleetManager} from '../fleet/manager.js';
import {PlanetManager} from '../planet/manager.js';
import {stringifyWithBigInt} from '../helpers/index.js';

/**
 * Tool handler for sending fleet
 * Handles the MCP tool request to send a fleet from one planet to another
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param fleetManager - The FleetManager instance to perform the fleet send
 * @param planetManager - The PlanetManager instance to convert coordinates to planet IDs
 * @returns The tool result with fleet details, or error details
 */
export async function handleSendFleet(
	args: unknown,
	fleetManager: FleetManager,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = sendFleetSchema.parse(args);
		const {from, to, quantity, arrivalTimeWanted, gift, specific} = parsed;

		// Convert coordinates to planet IDs
		const fromPlanetId = planetManager.getPlanetIdByCoordinates(from.x, from.y);
		if (!fromPlanetId) {
			return {
				content: [
					{
						type: 'text',
						text: stringifyWithBigInt(
							{
								success: false,
								error: `No planet found at source coordinates (${from.x}, ${from.y})`,
							},
							2,
						),
					},
				],
				isError: true,
			};
		}

		const toPlanetId = planetManager.getPlanetIdByCoordinates(to.x, to.y);
		if (!toPlanetId) {
			return {
				content: [
					{
						type: 'text',
						text: stringifyWithBigInt(
							{
								success: false,
								error: `No planet found at destination coordinates (${to.x}, ${to.y})`,
							},
							2,
						),
					},
				],
				isError: true,
			};
		}

		const result = await fleetManager.send(fromPlanetId, toPlanetId, quantity, {
			arrivalTimeWanted:
				typeof arrivalTimeWanted === 'undefined' ? undefined : BigInt(arrivalTimeWanted),
			gift: gift ?? false,
			specific: (specific as `0x${string}`) ?? '0x',
		});

		return {
			content: [
				{
					type: 'text',
					text: stringifyWithBigInt(
						{
							success: true,
							fleetId: result.fleetId,
							from: result.fromPlanetId,
							to: result.toPlanetId,
							quantity: result.quantity,
							arrivalTimeWanted: result.arrivalTimeWanted,
							secret: result.secret,
						},
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
					text: stringifyWithBigInt(
						{
							success: false,
							error: error instanceof Error ? error.message : String(error),
						},
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
	from: z.object({x: z.number(), y: z.number()}).describe('Source planet coordinates {x, y}'),
	to: z.object({x: z.number(), y: z.number()}).describe('Destination planet coordinates {x, y}'),
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
