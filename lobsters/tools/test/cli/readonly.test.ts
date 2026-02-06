import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';

describe('CLI - Read-Only Operations', () => {
	beforeAll(async () => {
		await setupTestEnvironment();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('get_my_planets', () => {
		it('should return empty array when no planets owned', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.planets).toBeDefined();
			expect(Array.isArray(result.planets)).toBe(true);
		});

		it('should accept radius parameter', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'50',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.planets).toBeDefined();
		});

		it('should return planets with correct structure', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			// Check that if there are planets, they have the expected structure
			if (result.planets.length > 0) {
				const planet = result.planets[0];
				expect(planet).toHaveProperty('planetId');
				expect(planet).toHaveProperty('location');
				expect(planet.location).toHaveProperty('x');
				expect(planet.location).toHaveProperty('y');
				expect(planet.location).toHaveProperty('id');
			}
		});

		it('should handle small radius (1)', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'1',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.planets).toBeDefined();
		});

		it('should handle maximum radius (50)', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'50',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.planets).toBeDefined();
		});
	});

	describe('get_planets_around', () => {
		it('should return planets around center (0, 0)', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'0',
				'--centerY',
				'0',
				'--radius',
				'10',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result).toHaveProperty('center');
			expect(result.center.x).toBe(0);
			expect(result.center.y).toBe(0);
			expect(result.radius).toBe(10);
			expect(result.planets).toBeDefined();
			expect(Array.isArray(result.planets)).toBe(true);
		});

		it('should return planets with distance information', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'0',
				'--centerY',
				'0',
				'--radius',
				'10',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			if (result.planets.length > 0) {
				const planet = result.planets[0];
				expect(planet).toHaveProperty('distance');
				expect(typeof planet.distance).toBe('number');
				expect(planet.distance).toBeGreaterThanOrEqual(0);
			}
		});

		it('should handle different center points', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'10',
				'--centerY',
				'10',
				'--radius',
				'5',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result.center.x).toBe(10);
			expect(result.center.y).toBe(10);
			expect(result.planets).toBeDefined();
		});

		it('should handle negative coordinates', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'-10',
				'--centerY',
				'-10',
				'--radius',
				'5',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result.center.x).toBe(-10);
			expect(result.center.y).toBe(-10);
			expect(result.planets).toBeDefined();
		});

		it('should return planets with correct structure', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'0',
				'--centerY',
				'0',
				'--radius',
				'10',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			if (result.planets.length > 0) {
				const planet = result.planets[0];
				expect(planet).toHaveProperty('planetId');
				expect(planet).toHaveProperty('distance');
				expect(planet).toHaveProperty('location');
				expect(planet.location).toHaveProperty('x');
				expect(planet.location).toHaveProperty('y');
			}
		});

		it('should handle small radius (1)', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'0',
				'--centerY',
				'0',
				'--radius',
				'1',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			expect(result.radius).toBe(1);
			expect(result.planets).toBeDefined();
		});
	});

	describe('get_pending_fleets', () => {
		it('should return empty array when no pending fleets', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_fleets',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.fleets).toBeDefined();
			expect(Array.isArray(result.fleets)).toBe(true);
		});

		it('should return fleets with correct structure', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_fleets',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			if (result.fleets.length > 0) {
				const fleet = result.fleets[0];
				expect(fleet).toHaveProperty('fleetId');
				expect(fleet).toHaveProperty('fromPlanetId');
				expect(fleet).toHaveProperty('toPlanetId');
				expect(fleet).toHaveProperty('quantity');
				expect(fleet).toHaveProperty('secret');
				expect(fleet).toHaveProperty('gift');
				expect(fleet).toHaveProperty('specific');
				expect(fleet).toHaveProperty('arrivalTimeWanted');
				expect(fleet).toHaveProperty('fleetSender');
				expect(fleet).toHaveProperty('operator');
				expect(fleet).toHaveProperty('committedAt');
				expect(fleet).toHaveProperty('estimatedArrivalTime');
				expect(fleet).toHaveProperty('resolved');
			}
		});

		it('should require no parameters', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_fleets',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.fleets).toBeDefined();
		});
	});

	describe('get_pending_exits', () => {
		it('should return empty array when no pending exits', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_exits',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.exits).toBeDefined();
			expect(Array.isArray(result.exits)).toBe(true);
		});

		it('should return exits with correct structure', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_exits',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);

			if (result.exits.length > 0) {
				const exit = result.exits[0];
				expect(exit).toHaveProperty('planetId');
				expect(exit).toHaveProperty('player');
				expect(exit).toHaveProperty('exitStartTime');
				expect(exit).toHaveProperty('exitDuration');
				expect(exit).toHaveProperty('exitCompleteTime');
				expect(exit).toHaveProperty('numSpaceships');
				expect(exit).toHaveProperty('owner');
				expect(exit).toHaveProperty('completed');
				expect(exit).toHaveProperty('interrupted');
				expect(exit).toHaveProperty('lastCheckedAt');
			}
		});

		it('should require no parameters', async () => {
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_exits',
			]);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.exits).toBeDefined();
		});
	});

	describe('Integration - Multiple read operations', () => {
		it('should be able to call multiple read operations in sequence', async () => {
			// Get my planets
			const myPlanetsResult = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_my_planets',
				'--radius',
				'10',
			]);
			expect(myPlanetsResult.exitCode).toBe(0);

			// Get planets around center
			const aroundResult = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				'0',
				'--centerY',
				'0',
				'--radius',
				'10',
			]);
			expect(aroundResult.exitCode).toBe(0);

			// Get pending fleets
			const fleetsResult = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_fleets',
			]);
			expect(fleetsResult.exitCode).toBe(0);

			// Get pending exits
			const exitsResult = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_pending_exits',
			]);
			expect(exitsResult.exitCode).toBe(0);

			// All should succeed
			const myPlanets = JSON.parse(myPlanetsResult.stdout);
			const around = JSON.parse(aroundResult.stdout);
			const fleets = JSON.parse(fleetsResult.stdout);
			const exits = JSON.parse(exitsResult.stdout);

			expect(myPlanets.planets).toBeDefined();
			expect(around.planets).toBeDefined();
			expect(fleets.fleets).toBeDefined();
			expect(exits.exits).toBeDefined();
		});
	});
});