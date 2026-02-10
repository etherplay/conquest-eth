import {z} from 'zod';
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
		.optional()
		.describe(
			'Optional array of planet coordinates to withdraw tokens from. If not provided, automatically withdraws from all planets that have completed exits and are ready for withdrawal.',
		),
});

export const withdraw = createTool<typeof schema, ConquestEnv>({
	description:
		'Withdraw staked tokens from planets that have completed their exit process. If coordinates are provided, withdraws from those specific planets. If no coordinates are provided, automatically finds and withdraws from all planets with completed exits that have not been withdrawn yet.',
	schema,
	execute: async (env, {coordinates}) => {
		try {
			// If coordinates are provided, withdraw from specific planets
			if (coordinates && coordinates.length > 0) {
				// Convert x,y coordinates to planet IDs
				const planetIdsBigInt: bigint[] = [];
				for (const coord of coordinates) {
					const planetId = env.planetManager.getPlanetIdByCoordinates(coord.x, coord.y);
					if (planetId === undefined) {
						throw new Error(`No planet found at coordinates (${coord.x}, ${coord.y})`);
					}
					planetIdsBigInt.push(planetId);
				}

				// Call withdraw method
				const result = await env.planetManager.withdraw(planetIdsBigInt);

				return {
					success: true,
					result: {
						transactionHash: result.hash,
						coordinates: coordinates,
						planetsWithdrawn: result.planetsWithdrawn.map((id) => id.toString()),
					},
				};
			}

			// No coordinates provided - automatically find and withdraw all ready exits
			const withdrawableExits = await env.planetManager.getWithdrawableExits();

			if (withdrawableExits.length === 0) {
				return {
					success: true,
					result: {
						message: 'No planets with completed exits ready for withdrawal',
						planetsWithdrawn: [],
					},
				};
			}

			// Get coordinates for the withdrawable planets (for return value)
			const withdrawableCoordinates = withdrawableExits
				.map((exit) => {
					const planet = env.planetManager.getPlanetInfo(exit.planetId);
					return planet ? {x: planet.location.x, y: planet.location.y} : null;
				})
				.filter((c): c is {x: number; y: number} => c !== null);

			// Withdraw all
			const result = await env.planetManager.withdrawAll();

			if (!result) {
				return {
					success: true,
					result: {
						message: 'No planets with completed exits ready for withdrawal',
						planetsWithdrawn: [],
					},
				};
			}

			return {
				success: true,
				result: {
					transactionHash: result.hash,
					coordinates: withdrawableCoordinates,
					planetsWithdrawn: result.planetsWithdrawn.map((id) => id.toString()),
					message: `Successfully withdrew tokens from ${result.planetsWithdrawn.length} planet(s)`,
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
