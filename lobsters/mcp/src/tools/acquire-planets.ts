import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import {PlanetManager} from '../planet/manager.js';

/**
 * Tool handler for acquiring planets
 * Handles the MCP tool request to acquire (stake) multiple planets in the Conquest game
 *
 * @param args - The tool arguments (will be validated against the schema)
 * @param planetManager - The PlanetManager instance to perform the acquisition
 * @returns The tool result with transaction hash and acquired planet IDs, or error details
 */
export async function handleAcquirePlanets(
	args: unknown,
	planetManager: PlanetManager,
): Promise<CallToolResult> {
	try {
		const parsed = acquirePlanetsSchema.parse(args);
		const {planetIds, amountToMint, tokenAmount} = parsed;

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
			const acquireResult = await planetManager.acquire(
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
			const autoResult = await planetManager.acquireWithAutoCalc(planetIdsBigInt);
			result = {
				hash: autoResult.hash,
				planetsAcquired: autoResult.planetsAcquired,
				amountToMint: autoResult.costs.amountToMint,
				tokenAmount: autoResult.costs.tokenAmount,
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							transactionHash: result.hash,
							planetsAcquired: result.planetsAcquired.map((id) => id.toString()),
							amountToMint: result.amountToMint.toString(),
							tokenAmount: result.tokenAmount.toString(),
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
 * Tool schema for acquiring planets (ZodRawShapeCompat format)
 */
export const acquirePlanetsSchema = z.object({
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
});
