import {z} from 'zod';
import {zeroAddress} from 'viem';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';
import type {PlanetState} from 'conquest-eth-v0-contracts';

const coordinatesSchema = z.object({
	x: z.number().describe('X coordinate'),
	y: z.number().describe('Y coordinate'),
});

const schema = z.object({
	from: coordinatesSchema.describe('Source planet coordinates {x, y}'),
	to: coordinatesSchema.describe('Target planet coordinates {x, y}'),
	quantity: z.number().positive().describe('Number of spaceships to send'),
});

export const simulate = createTool<typeof schema, ConquestEnv>({
	description:
		'Simulate the outcome of a fleet attack. Returns min/max outcomes including whether capture is successful, number of spaceships left, time until attack fails, and combat losses.',
	schema,
	execute: async (env, {from, to, quantity}) => {
		try {
			// Get planet info for source
			const fromPlanetId = env.planetManager.getPlanetIdByCoordinates(from.x, from.y);
			if (!fromPlanetId) {
				return {
					success: false,
					error: `No planet found at source coordinates (${from.x}, ${from.y})`,
				};
			}
			const fromPlanet = env.planetManager.getPlanetInfo(fromPlanetId);
			if (!fromPlanet) {
				return {
					success: false,
					error: `Could not get planet info for source planet at (${from.x}, ${from.y})`,
				};
			}

			// Get planet info for target
			const toPlanetId = env.planetManager.getPlanetIdByCoordinates(to.x, to.y);
			if (!toPlanetId) {
				return {
					success: false,
					error: `No planet found at target coordinates (${to.x}, ${to.y})`,
				};
			}
			const toPlanet = env.planetManager.getPlanetInfo(toPlanetId);
			if (!toPlanet) {
				return {
					success: false,
					error: `Could not get planet info for target planet at (${to.x}, ${to.y})`,
				};
			}

			// Fetch current state of target planet
			const planetsWithState = await env.planetManager.getPlanetsAround(to.x, to.y, 0);
			if (planetsWithState.length === 0) {
				return {
					success: false,
					error: `Could not fetch state for target planet at (${to.x}, ${to.y})`,
				};
			}

			const toPlanetState = planetsWithState[0].state as PlanetState;

			// Calculate travel time
			const travelTime = env.spaceInfo.timeToArrive(fromPlanet, toPlanet);

			// Calculate distance
			const distance = env.spaceInfo.distance(fromPlanet, toPlanet);

			// Use outcome() to simulate the attack
			// Note: We pass undefined for player-related params since we're doing a simple simulation
			const outcome = env.spaceInfo.outcome(
				fromPlanet,
				toPlanet,
				toPlanetState,
				quantity,
				travelTime,
				undefined, // senderPlayer
				undefined, // fromPlayer
				undefined, // toPlayer
				false, // gift
				undefined, // specific
			);

			return {
				success: true,
				result: {
					from: {x: from.x, y: from.y},
					to: {x: to.x, y: to.y},
					quantity,
					travelTime,
					distance,
					outcome: {
						min: {
							captured: outcome.min.captured,
							numSpaceshipsLeft: outcome.min.numSpaceshipsLeft,
						},
						max: {
							captured: outcome.max.captured,
							numSpaceshipsLeft: outcome.max.numSpaceshipsLeft,
						},
						timeUntilFails: outcome.timeUntilFails,
						nativeResist: outcome.nativeResist,
						gift: outcome.gift,
						allies: outcome.allies,
						combat: outcome.combat
							? {
									defenderLoss: outcome.combat.defenderLoss,
									attackerLoss: outcome.combat.attackerLoss,
								}
							: undefined,
						tax: outcome.tax
							? {
									taxRate: outcome.tax.taxRate,
									loss: outcome.tax.loss,
								}
							: undefined,
					},
					targetPlanet: {
						owner: toPlanetState.owner ?? null,
						numSpaceships: toPlanetState.numSpaceships,
						natives: toPlanetState.natives,
						active: toPlanetState.active,
						exiting: toPlanetState.exiting,
					},
					sourcePlanet: {
						attack: fromPlanet.stats.attack,
						speed: fromPlanet.stats.speed,
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
