import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';

// Store test planets discovered in beforeAll
let testPlanets: Array<{location: {x: number; y: number}}> = [];

describe('CLI - Simulate Multiple Fleets', () => {
	beforeAll(async () => {
		await setupTestEnvironment();

		// Get planets once for all tests
		const planetsResult = await invokeCliCommand([
			'--rpc-url',
			RPC_URL,
			'--game-contract',
			getGameContract(),
			'get_planets_around',
			'--center',
			'0,0',
			'--radius',
			'20',
		]);

		if (planetsResult.exitCode === 0) {
			const planetsData = JSON.parse(planetsResult.stdout);
			testPlanets = planetsData.planets || [];
		}
	}, 60000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('simulate_multiple', () => {
		it('should simulate multiple fleets attacking the same target', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(3);

			const fleet1From = testPlanets[0];
			const fleet2From = testPlanets[1];
			const target = testPlanets[2];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fleet1From.location.x, y: fleet1From.location.y}, quantity: 1000},
					{from: {x: fleet2From.location.x, y: fleet2From.location.y}, quantity: 500},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			// Check basic structure
			expect(result.to).toBeDefined();
			expect(result.fleets).toBeDefined();
			expect(result.fleets.length).toBe(2);
			expect(result.finalOutcome).toBeDefined();
		}, 30000);

		it('should return individual fleet outcomes', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(3);

			const fleet1From = testPlanets[0];
			const fleet2From = testPlanets[1];
			const target = testPlanets[2];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fleet1From.location.x, y: fleet1From.location.y}, quantity: 2000},
					{from: {x: fleet2From.location.x, y: fleet2From.location.y}, quantity: 1500},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			// Check each fleet outcome structure
			for (const fleet of result.fleets) {
				expect(fleet.from).toBeDefined();
				expect(fleet.quantity).toBeDefined();
				expect(typeof fleet.travelTime).toBe('number');
				expect(typeof fleet.distance).toBe('number');
				expect(fleet.sourcePlanet).toBeDefined();
				expect(typeof fleet.sourcePlanet.attack).toBe('number');
				expect(typeof fleet.sourcePlanet.speed).toBe('number');
				expect(fleet.outcome).toBeDefined();
				expect(fleet.outcome.min).toBeDefined();
				expect(fleet.outcome.max).toBeDefined();
				expect(typeof fleet.outcome.min.captured).toBe('boolean');
				expect(typeof fleet.outcome.min.numSpaceshipsLeft).toBe('number');
			}
		}, 30000);

		it('should return final combined outcome', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(3);

			const fleet1From = testPlanets[0];
			const fleet2From = testPlanets[1];
			const target = testPlanets[2];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fleet1From.location.x, y: fleet1From.location.y}, quantity: 30000},
					{from: {x: fleet2From.location.x, y: fleet2From.location.y}, quantity: 25000},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			// Check final outcome structure
			expect(result.finalOutcome.min).toBeDefined();
			expect(result.finalOutcome.max).toBeDefined();
			expect(typeof result.finalOutcome.min.captured).toBe('boolean');
			expect(typeof result.finalOutcome.min.numSpaceshipsLeft).toBe('number');
			expect(typeof result.finalOutcome.max.captured).toBe('boolean');
			expect(typeof result.finalOutcome.max.numSpaceshipsLeft).toBe('number');
		}, 30000);

		it('should return arrival time', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(3);

			const fleet1From = testPlanets[0];
			const fleet2From = testPlanets[1];
			const target = testPlanets[2];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fleet1From.location.x, y: fleet1From.location.y}, quantity: 1000},
					{from: {x: fleet2From.location.x, y: fleet2From.location.y}, quantity: 500},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			// Arrival time should be the max of all fleet travel times when not specified
			expect(typeof result.arrivalTime).toBe('number');
			expect(result.arrivalTime).toBeGreaterThan(0);
		}, 30000);

		it('should accept custom arrival time', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(3);

			const fleet1From = testPlanets[0];
			const fleet2From = testPlanets[1];
			const target = testPlanets[2];

			const customArrivalTime = 7200; // 2 hours

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fleet1From.location.x, y: fleet1From.location.y}, quantity: 1000},
					{from: {x: fleet2From.location.x, y: fleet2From.location.y}, quantity: 500},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
				'--arrival-time',
				String(customArrivalTime),
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result.arrivalTime).toBe(customArrivalTime);
		}, 30000);

		it('should return target planet state', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(3);

			const fleet1From = testPlanets[0];
			const fleet2From = testPlanets[1];
			const target = testPlanets[2];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fleet1From.location.x, y: fleet1From.location.y}, quantity: 1000},
					{from: {x: fleet2From.location.x, y: fleet2From.location.y}, quantity: 500},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			// Check target planet state
			expect(result.targetPlanet).toBeDefined();
			expect(typeof result.targetPlanet.numSpaceships).toBe('number');
			expect(typeof result.targetPlanet.natives).toBe('boolean');
			expect(typeof result.targetPlanet.active).toBe('boolean');
		}, 30000);

		it('should work with a single fleet (edge case)', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(2);

			const fromPlanet = testPlanets[0];
			const target = testPlanets[1];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fromPlanet.location.x, y: fromPlanet.location.y}, quantity: 5000},
				]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result.fleets.length).toBe(1);
			expect(result.finalOutcome).toBeDefined();
		}, 30000);

		it('should work with many fleets', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(5);

			const target = testPlanets[4];
			const fleets = [
				{from: {x: testPlanets[0].location.x, y: testPlanets[0].location.y}, quantity: 1000},
				{from: {x: testPlanets[1].location.x, y: testPlanets[1].location.y}, quantity: 800},
				{from: {x: testPlanets[2].location.x, y: testPlanets[2].location.y}, quantity: 1200},
				{from: {x: testPlanets[3].location.x, y: testPlanets[3].location.y}, quantity: 600},
			];

			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify(fleets),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result.fleets.length).toBe(4);
		}, 30000);

		it('should fail for non-existent source planet', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(1);

			const target = testPlanets[0];

			const {stdout, stderr, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([{from: {x: 999999, y: 999999}, quantity: 1000}]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			expect(exitCode).toBe(1);
			const output = stderr || stdout;
			expect(output).toContain('No planet found at source coordinates');
		}, 30000);

		it('should fail for non-existent target planet', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(1);

			const fromPlanet = testPlanets[0];

			const {stdout, stderr, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([
					{from: {x: fromPlanet.location.x, y: fromPlanet.location.y}, quantity: 1000},
				]),
				'--to',
				'999999,999999',
			]);

			expect(exitCode).toBe(1);
			const output = stderr || stdout;
			expect(output).toContain('No planet found at target coordinates');
		}, 30000);

		it('should require at least one fleet', async () => {
			const {exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([]),
				'--to',
				'0,0',
			]);

			// Empty fleets array should fail validation
			expect(exitCode).not.toBe(0);
		}, 30000);

		it('should require positive quantity for each fleet', async () => {
			expect(testPlanets.length).toBeGreaterThanOrEqual(2);

			const fromPlanet = testPlanets[0];
			const target = testPlanets[1];

			const {exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'simulate_multiple',
				'--fleets',
				JSON.stringify([{from: {x: fromPlanet.location.x, y: fromPlanet.location.y}, quantity: 0}]),
				'--to',
				`${target.location.x},${target.location.y}`,
			]);

			// Zero quantity should fail validation
			expect(exitCode).not.toBe(0);
		}, 30000);
	});
});
