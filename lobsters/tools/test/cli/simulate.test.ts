import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';

// Store test planets discovered in beforeAll
let testPlanets: Array<{location: {x: number; y: number}}> = [];

describe('CLI - Simulate', () => {
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

	describe('simulate', () => {
		it(
			'should simulate a fleet attack between two planets',
			async () => {
				expect(testPlanets.length).toBeGreaterThanOrEqual(2);

				const fromPlanet = testPlanets[0];
				const toPlanet = testPlanets[1];

				const {stdout, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					`${fromPlanet.location.x},${fromPlanet.location.y}`,
					'--to',
					`${toPlanet.location.x},${toPlanet.location.y}`,
					'--quantity',
					'1000',
				]);

				expect(exitCode).toBe(0);
				const result = JSON.parse(stdout);

				// Successful tool output is the result directly
				expect(result.from).toBeDefined();
				expect(result.to).toBeDefined();
				expect(result.quantity).toBe(1000);
			},
			30000,
		);

		it(
			'should return outcome with min/max capture information',
			async () => {
				expect(testPlanets.length).toBeGreaterThanOrEqual(2);

				const fromPlanet = testPlanets[0];
				const toPlanet = testPlanets[1];

				const {stdout, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					`${fromPlanet.location.x},${fromPlanet.location.y}`,
					'--to',
					`${toPlanet.location.x},${toPlanet.location.y}`,
					'--quantity',
					'50000',
				]);

				expect(exitCode).toBe(0);
				const result = JSON.parse(stdout);

				// Check outcome structure
				expect(result.outcome).toBeDefined();
				expect(result.outcome.min).toBeDefined();
				expect(result.outcome.max).toBeDefined();
				expect(typeof result.outcome.min.captured).toBe('boolean');
				expect(typeof result.outcome.min.numSpaceshipsLeft).toBe('number');
				expect(typeof result.outcome.max.captured).toBe('boolean');
				expect(typeof result.outcome.max.numSpaceshipsLeft).toBe('number');
			},
			30000,
		);

		it(
			'should return travel time and distance',
			async () => {
				expect(testPlanets.length).toBeGreaterThanOrEqual(2);

				const fromPlanet = testPlanets[0];
				const toPlanet = testPlanets[1];

				const {stdout, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					`${fromPlanet.location.x},${fromPlanet.location.y}`,
					'--to',
					`${toPlanet.location.x},${toPlanet.location.y}`,
					'--quantity',
					'1000',
				]);

				expect(exitCode).toBe(0);
				const result = JSON.parse(stdout);

				// Check travel time and distance
				expect(typeof result.travelTime).toBe('number');
				expect(typeof result.distance).toBe('number');
				expect(result.travelTime).toBeGreaterThan(0);
				expect(result.distance).toBeGreaterThan(0);
			},
			30000,
		);

		it(
			'should return target planet state',
			async () => {
				expect(testPlanets.length).toBeGreaterThanOrEqual(2);

				const fromPlanet = testPlanets[0];
				const toPlanet = testPlanets[1];

				const {stdout, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					`${fromPlanet.location.x},${fromPlanet.location.y}`,
					'--to',
					`${toPlanet.location.x},${toPlanet.location.y}`,
					'--quantity',
					'1000',
				]);

				expect(exitCode).toBe(0);
				const result = JSON.parse(stdout);

				// Check target planet state
				expect(result.targetPlanet).toBeDefined();
				expect(typeof result.targetPlanet.numSpaceships).toBe('number');
				expect(typeof result.targetPlanet.natives).toBe('boolean');
				expect(typeof result.targetPlanet.active).toBe('boolean');
			},
			30000,
		);

		it(
			'should return source planet attack/speed stats',
			async () => {
				expect(testPlanets.length).toBeGreaterThanOrEqual(2);

				const fromPlanet = testPlanets[0];
				const toPlanet = testPlanets[1];

				const {stdout, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					`${fromPlanet.location.x},${fromPlanet.location.y}`,
					'--to',
					`${toPlanet.location.x},${toPlanet.location.y}`,
					'--quantity',
					'1000',
				]);

				expect(exitCode).toBe(0);
				const result = JSON.parse(stdout);

				// Check source planet stats
				expect(result.sourcePlanet).toBeDefined();
				expect(typeof result.sourcePlanet.attack).toBe('number');
				expect(typeof result.sourcePlanet.speed).toBe('number');
			},
			30000,
		);

		it(
			'should fail for non-existent source planet',
			async () => {
				const {stdout, stderr, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					'999999,999999',
					'--to',
					'0,0',
					'--quantity',
					'1000',
				]);

				// When the tool returns {success: false, error: ...}, the CLI exits with 1 and outputs error to stderr
				expect(exitCode).toBe(1);
				// Error may be in stderr as JSON or as plain text
				const output = stderr || stdout;
				expect(output).toContain('No planet found at source coordinates');
			},
			30000,
		);

		it(
			'should fail for non-existent target planet',
			async () => {
				expect(testPlanets.length).toBeGreaterThanOrEqual(1);

				const fromPlanet = testPlanets[0];

				const {stdout, stderr, exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					`${fromPlanet.location.x},${fromPlanet.location.y}`,
					'--to',
					'999999,999999',
					'--quantity',
					'1000',
				]);

				// When the tool returns {success: false, error: ...}, the CLI exits with 1 and outputs error to stderr
				expect(exitCode).toBe(1);
				// Error may be in stderr as JSON or as plain text
				const output = stderr || stdout;
				expect(output).toContain('No planet found at target coordinates');
			},
			30000,
		);

		it(
			'should require positive quantity',
			async () => {
				const {exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					'0,0',
					'--to',
					'1,1',
					'--quantity',
					'0',
				]);

				// Zero quantity should fail validation
				expect(exitCode).not.toBe(0);
			},
			30000,
		);

		it(
			'should reject negative quantity',
			async () => {
				const {exitCode} = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'simulate',
					'--from',
					'0,0',
					'--to',
					'1,1',
					'--quantity',
					'-100',
				]);

				// Negative quantity should fail validation
				expect(exitCode).not.toBe(0);
			},
			30000,
		);
	});
});
