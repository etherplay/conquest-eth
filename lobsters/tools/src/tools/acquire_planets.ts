import {z} from 'zod';
import {formatUnits} from 'viem';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	coordinates: z
		.array(
			z.object({
				x: z.number().describe('X coordinate of the planet'),
				y: z.number().describe('Y coordinate of the planet'),
			}),
		)
		.describe('Array of planet coordinates to acquire'),
});

export const acquire_planets = createTool<typeof schema, ConquestEnv>({
	description:
		'Acquire (stake) multiple planets in the Conquest game. This allows you to take ownership of unclaimed planets. Automatically uses all available play token balance first, then mints the remainder with native tokens.',
	schema,
	execute: async (env, {coordinates}) => {
		try {
			// Convert x,y coordinates to planet IDs
			const planetIdsBigInt: bigint[] = [];
			for (const coord of coordinates) {
				const planetId = env.planetManager.getPlanetIdByCoordinates(coord.x, coord.y);
				if (planetId === undefined) {
					throw new Error(`No planet found at coordinates (${coord.x}, ${coord.y})`);
				}
				planetIdsBigInt.push(planetId);
			}

			// Acquire planets using max play token balance first, then minting remainder
			const result = await env.planetManager.acquireWithMaxPlayToken(planetIdsBigInt);

			return {
				success: true,
				result: {
					transactionHash: result.hash,
					planetsAcquired: result.planetsAcquired,
					costs: {
						totalRequired: formatUnits(result.costs.totalRequired, 18),
						playTokenUsed: formatUnits(result.costs.playTokenUsed, 18),
						amountMinted: formatUnits(result.costs.amountMinted, 18),
					},
					approval: {
						approvalNeeded: result.approval.approvalNeeded,
						approvalHash: result.approval.approvalHash,
					},
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
