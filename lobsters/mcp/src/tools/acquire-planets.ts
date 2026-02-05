import {z} from 'zod';
import {createTool} from '../types.js';
import {stringifyWithBigInt} from '../helpers/index.js';

export const acquire_planets = createTool({
	description:
		'Acquire (stake) multiple planets in the Conquest game. This allows you to take ownership of unclaimed planets.',
	schema: z.object({
		planetIds: z
			.array(z.union([z.string(), z.number()]))
			.describe('Array of planet location IDs to acquire (as hex strings or numbers)'),
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
	execute: async (env, {planetIds, amountToMint, tokenAmount}) => {
		try {
			// Convert planet IDs to BigInt
			const planetIdsBigInt = planetIds.map((id) =>
				typeof id === 'string' ? BigInt(id) : BigInt(id),
			);

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