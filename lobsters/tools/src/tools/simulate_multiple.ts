import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';
import type {PlanetState, FleetInput} from 'conquest-eth-v0-contracts';

const coordinatesSchema = z.object({
	x: z.number().describe('X coordinate'),
	y: z.number().describe('Y coordinate'),
});

// Schema for multiple fleets simulation
const schema = z.object({
	fleets: z.array(z.object({
		from: coordinatesSchema.describe('Source planet coordinates {x, y}'),
		quantity: z.number().positive().describe('Number of spaceships to send'),
	})).min(1).describe('Array of fleets to send to the target'),
	to: coordinatesSchema.describe('Target planet coordinates {x, y}'),
	arrivalTime: z.number().optional().describe('Specific arrival time in seconds. If not provided, uses the maximum travel time from all fleets.'),
});

export const simulate_multiple = createTool<typeof schema, ConquestEnv>({
	description:
		'Simulate the outcome of multiple fleets attacking the same target planet. Fleets are processed sequentially, with the planet state updated after each combat. Returns individual fleet outcomes and the final combined result.',
	schema,
	execute: async (env, {fleets, to, arrivalTime}) => {
		try {
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

			// Build fleet inputs with planet info
			const fleetInputs: FleetInput[] = [];
			const fleetDetails: Array<{from: {x: number; y: number}; quantity: number; travelTime: number; distance: number; attack: number; speed: number}> = [];

			for (const fleet of fleets) {
				// Get planet info for source
				const fromPlanetId = env.planetManager.getPlanetIdByCoordinates(fleet.from.x, fleet.from.y);
				if (!fromPlanetId) {
					return {
						success: false,
						error: `No planet found at source coordinates (${fleet.from.x}, ${fleet.from.y})`,
					};
				}
				const fromPlanet = env.planetManager.getPlanetInfo(fromPlanetId);
				if (!fromPlanet) {
					return {
						success: false,
						error: `Could not get planet info for source planet at (${fleet.from.x}, ${fleet.from.y})`,
					};
				}

				const travelTime = env.spaceInfo.timeToArrive(fromPlanet, toPlanet);
				const distance = env.spaceInfo.distance(fromPlanet, toPlanet);

				fleetInputs.push({
					fromPlanet,
					fleetAmount: fleet.quantity,
					// We pass undefined for player-related params since we're doing a simple simulation
					senderPlayer: undefined,
					fromPlayer: undefined,
					gift: false,
					specific: undefined,
					extra: undefined,
				});

				fleetDetails.push({
					from: {x: fleet.from.x, y: fleet.from.y},
					quantity: fleet.quantity,
					travelTime,
					distance,
					attack: fromPlanet.stats.attack,
					speed: fromPlanet.stats.speed,
				});
			}

			// Use outcomeMultipleFleets() to simulate the combined attack
			const multipleOutcome = env.spaceInfo.outcomeMultipleFleets(
				fleetInputs,
				toPlanet,
				toPlanetState,
				arrivalTime,
				undefined, // toPlayer
			);

			// Format the fleet outcomes
			const formattedFleetOutcomes = multipleOutcome.fleets.map((fleetOutcome, index) => ({
				from: fleetDetails[index].from,
				quantity: fleetDetails[index].quantity,
				travelTime: fleetDetails[index].travelTime,
				distance: fleetDetails[index].distance,
				sourcePlanet: {
					attack: fleetDetails[index].attack,
					speed: fleetDetails[index].speed,
				},
				outcome: {
					min: {
						captured: fleetOutcome.outcome.min.captured,
						numSpaceshipsLeft: fleetOutcome.outcome.min.numSpaceshipsLeft,
					},
					max: {
						captured: fleetOutcome.outcome.max.captured,
						numSpaceshipsLeft: fleetOutcome.outcome.max.numSpaceshipsLeft,
					},
					timeUntilFails: fleetOutcome.outcome.timeUntilFails,
					nativeResist: fleetOutcome.outcome.nativeResist,
					gift: fleetOutcome.outcome.gift,
					allies: fleetOutcome.outcome.allies,
					combat: fleetOutcome.outcome.combat
						? {
								defenderLoss: fleetOutcome.outcome.combat.defenderLoss,
								attackerLoss: fleetOutcome.outcome.combat.attackerLoss,
							}
						: undefined,
					tax: fleetOutcome.outcome.tax
						? {
								taxRate: fleetOutcome.outcome.tax.taxRate,
								loss: fleetOutcome.outcome.tax.loss,
							}
						: undefined,
				},
			}));

			return {
				success: true,
				result: {
					to: {x: to.x, y: to.y},
					arrivalTime: multipleOutcome.arrivalTime,
					fleets: formattedFleetOutcomes,
					finalOutcome: {
						min: {
							captured: multipleOutcome.finalOutcome.min.captured,
							numSpaceshipsLeft: multipleOutcome.finalOutcome.min.numSpaceshipsLeft,
							owner: multipleOutcome.finalOutcome.min.owner ?? null,
						},
						max: {
							captured: multipleOutcome.finalOutcome.max.captured,
							numSpaceshipsLeft: multipleOutcome.finalOutcome.max.numSpaceshipsLeft,
							owner: multipleOutcome.finalOutcome.max.owner ?? null,
						},
					},
					targetPlanet: {
						owner: toPlanetState.owner ?? null,
						numSpaceships: toPlanetState.numSpaceships,
						natives: toPlanetState.natives,
						active: toPlanetState.active,
						exiting: toPlanetState.exiting,
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
