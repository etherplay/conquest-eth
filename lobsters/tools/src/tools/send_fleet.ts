import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import {zeroAddress} from 'viem';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
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

export const send_fleet = createTool<typeof schema, ConquestEnv>({
	description:
		'Send a fleet from one planet to another in the Conquest game. The fleet will travel through space and can be resolved after arrival.',
	schema,
	execute: async (env, {from, to, quantity, arrivalTimeWanted, gift, specific}) => {
		try {
			// Convert coordinates to planet IDs
			const fromPlanetId = env.planetManager.getPlanetIdByCoordinates(from.x, from.y);
			if (!fromPlanetId) {
				return {
					success: false,
					error: `No planet found at source coordinates (${from.x}, ${from.y})`,
				};
			}

			const toPlanetId = env.planetManager.getPlanetIdByCoordinates(to.x, to.y);
			if (!toPlanetId) {
				return {
					success: false,
					error: `No planet found at destination coordinates (${to.x}, ${to.y})`,
				};
			}

			const result = await env.fleetManager.send(fromPlanetId, toPlanetId, quantity, {
				arrivalTimeWanted:
					typeof arrivalTimeWanted === 'undefined' ? undefined : BigInt(arrivalTimeWanted),
				gift: gift ?? false,
				specific: (specific as `0x${string}`) ?? zeroAddress,
			});

			return {
				success: true,
				result: {
					fleetId: result.fleetId,
					from: result.fromPlanetId,
					to: result.toPlanetId,
					quantity: result.quantity,
					arrivalTimeWanted: result.arrivalTimeWanted,
					secret: result.secret,
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
