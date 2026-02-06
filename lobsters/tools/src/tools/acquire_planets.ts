import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';

export const acquire_planets = createTool({
	description:
		'Acquire (stake) multiple planets in the Conquest game. This allows you to take ownership of unclaimed planets.',
	schema: z.object({
		coordinates: z
			.array(
				z.object({
					x: z.number().describe('X coordinate of the planet'),
					y: z.number().describe('Y coordinate of the planet'),
				}),
			)
			.describe('Array of planet coordinates to acquire'),
		amountToMint: z
			.number()
			.optional()
			.describe(
				'Amount of native token to spend to acquire the planets. If not provided, will be calculated automatically based on planet stats.',
			),
		tokenAmount: z
			.number()
			.optional()
			.describe(
				'Amount of staking token to spend to acquire the planets. If not provided, will be calculated automatically based on planet stats.',
			),
	}),
	execute: async (env, {coordinates, amountToMint, tokenAmount}) => {
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

			let result: {
				hash: `0x${string}`;
				planetsAcquired: bigint[];
				amountToMint: bigint;
				tokenAmount: bigint;
			};

			// If BOTH amounts are provided, use them; otherwise use auto-calculation
			if (amountToMint !== undefined && tokenAmount !== undefined) {
				// Use provided amounts
				// TODO decimal handling, for now BigInt()
				const acquireResult = await env.planetManager.acquire(
					planetIdsBigInt,
					BigInt(amountToMint),
					BigInt(tokenAmount),
				);
				result = {
					hash: acquireResult.hash,
					planetsAcquired: acquireResult.planetsAcquired,
					amountToMint: BigInt(amountToMint),
					tokenAmount: BigInt(tokenAmount),
				};
			} else {
				// Use auto-calculation
				const autoResult = await env.planetManager.acquireWithAutoCalc(planetIdsBigInt);
				result = {
					hash: autoResult.hash,
					planetsAcquired: autoResult.planetsAcquired,
					amountToMint: autoResult.costs.amountToMint,
					tokenAmount: autoResult.costs.tokenAmount,
				};
			}

			return {
				success: true,
				result: {
					transactionHash: result.hash,
					planetsAcquired: result.planetsAcquired,
					amountToMint: result.amountToMint,
					tokenAmount: result.tokenAmount,
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
