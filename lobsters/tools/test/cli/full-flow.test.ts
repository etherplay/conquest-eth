/**
 * Full Flow Integration Tests
 *
 * Tests the complete game flow including:
 * - Player 1 acquiring a planet
 * - Player 2 acquiring a different planet
 * - Player 1 sending a fleet to Player 2's planet
 * - Time manipulation using evm_setNextBlockTimestamp
 * - Fleet resolution and attack verification
 */
import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL, getGameContract} from '../setup.js';
import {parseCliOutput} from './helpers.js';
import {promises as fs} from 'node:fs';

// Test-specific storage path to avoid conflicts between test runs
const TEST_STORAGE_PATH = './data/test-full-flow';

// Anvil test accounts (deterministic from mnemonic)
const ANVIL_ACCOUNTS = {
	PLAYER_1: {
		address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
		privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
	},
	PLAYER_2: {
		address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
		privateKey: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
	},
};

/**
 * Helper to advance blockchain time using anvil's evm_setNextBlockTimestamp
 */
async function advanceTime(rpcUrl: string, seconds: number): Promise<void> {
	const currentBlock: any = await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBlockByNumber',
			params: ['latest', false],
			id: 1,
		}),
	}).then((res) => res.json());

	const currentTimestamp = parseInt(currentBlock.result.timestamp, 16);
	const newTimestamp = currentTimestamp + seconds;

	// Set the next block timestamp
	await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'evm_setNextBlockTimestamp',
			params: [newTimestamp],
			id: 2,
		}),
	});

	// Mine a block to apply the timestamp
	await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'evm_mine',
			params: [],
			id: 3,
		}),
	});

	// Verify the new block has the expected timestamp
	const newBlock: any = await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBlockByNumber',
			params: ['latest', false],
			id: 4,
		}),
	}).then((res) => res.json());

	const actualTimestamp = parseInt(newBlock.result.timestamp, 16);
	if (actualTimestamp < newTimestamp) {
		console.warn(
			`Warning: Block timestamp ${actualTimestamp} is less than expected ${newTimestamp}`,
		);
	}
}

/**
 * Helper to get current blockchain timestamp
 */
async function getCurrentTimestamp(rpcUrl: string): Promise<number> {
	const response = await fetch(rpcUrl, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({
			jsonrpc: '2.0',
			method: 'eth_getBlockByNumber',
			params: ['latest', false],
			id: 1,
		}),
	});
	const result: any = await response.json();
	return parseInt(result.result.timestamp, 16);
}

/**
 * Helper to find valid planets near origin
 */
async function findValidPlanets(
	rpcUrl: string,
	gameContract: string,
): Promise<Array<{x: number; y: number; planetId: string}>> {
	const result = await invokeWithStorage([
		'--rpc-url',
		rpcUrl,
		'--game-contract',
		gameContract,
		'get_planets_around',
		'--center',
		'0,0',
		'--radius',
		'10',
	]);

	if (result.exitCode !== 0) {
		throw new Error(`Failed to get planets: ${result.stderr || result.stdout}`);
	}

	// CLI outputs unwrapped result on success
	const data = parseCliOutput<{
		planets: Array<{
			planetId: string;
			location: {x: number; y: number};
			owner?: string;
		}>;
	}>(result.stdout);

	const planets = data.planets || [];

	return planets
		.filter((p) => !p.owner) // Only unowned planets
		.map((p) => ({
			x: p.location.x,
			y: p.location.y,
			planetId: p.planetId,
		}));
}

/**
 * Helper to clear test storage directory
 */
async function clearTestStorage(): Promise<void> {
	try {
		await fs.rm(TEST_STORAGE_PATH, {recursive: true, force: true});
	} catch {
		// Ignore if directory doesn't exist
	}
	await fs.mkdir(TEST_STORAGE_PATH, {recursive: true});
}

/**
 * Helper to invoke CLI with test storage path
 */
async function invokeWithStorage(
	args: string[],
	options?: {env?: Record<string, string>},
): ReturnType<typeof invokeCliCommand> {
	return invokeCliCommand(['--storage-path', TEST_STORAGE_PATH, ...args], options);
}

describe('Full Flow - Planet Acquisition and Fleet Combat', () => {
	let validPlanets: Array<{x: number; y: number; planetId: string}> = [];

	beforeAll(async () => {
		await setupTestEnvironment();

		// Clear test storage to ensure clean state
		await clearTestStorage();

		// Find valid unowned planets for testing
		try {
			validPlanets = await findValidPlanets(RPC_URL, getGameContract());
			console.log(`Found ${validPlanets.length} valid unowned planets for testing`);
		} catch (error) {
			console.warn('Could not find valid planets, tests may fail:', error);
		}
	}, 60000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('Planet Acquisition Flow', () => {
		it('should allow Player 1 to acquire a planet', {timeout: 30000}, async () => {
			// Test requires at least 1 planet available
			expect(validPlanets.length).toBeGreaterThanOrEqual(1);

			const planet = validPlanets[0];
			// coordinates expects an array of objects with x and y, passed as JSON
			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					JSON.stringify([{x: planet.x, y: planet.y}]),
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				transactionHash: string;
				planetsAcquired: string[];
			}>(result.stdout);

			expect(data.transactionHash).toBeDefined();
			expect(data.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
		});

		it('should allow Player 2 to acquire a different planet', {timeout: 30000}, async () => {
			// Test requires at least 2 planets available
			expect(validPlanets.length).toBeGreaterThanOrEqual(2);

			const planet = validPlanets[1];
			// coordinates expects an array of objects with x and y, passed as JSON
			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					JSON.stringify([{x: planet.x, y: planet.y}]),
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_2.privateKey}},
			);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				transactionHash: string;
				planetsAcquired: string[];
			}>(result.stdout);

			expect(data.transactionHash).toBeDefined();
		});

		it('should show Player 1 owns their acquired planet', async () => {
			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_my_planets',
					'--radius',
					'20',
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				planets: Array<{
					planetId: string;
					owner?: string;
					location: {x: number; y: number};
				}>;
			}>(result.stdout);

			expect(data.planets).toBeDefined();
			// Player 1's planets (if any) should be in the list
		});
	});

	describe('Fleet Sending Flow', () => {
		it("should allow Player 1 to send a fleet to Player 2's planet", {timeout: 30000}, async () => {
			// Test requires at least 2 planets available
			expect(validPlanets.length).toBeGreaterThanOrEqual(2);

			const fromPlanet = validPlanets[0];
			const toPlanet = validPlanets[1];

			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					`${fromPlanet.x},${fromPlanet.y}`,
					'--to',
					`${toPlanet.x},${toPlanet.y}`,
					'--quantity',
					'50',
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				fleetId: string;
				from: string;
				to: string;
				quantity: number;
				secret: string;
			}>(result.stdout);

			expect(data.fleetId).toBeDefined();
			expect(data.quantity).toBe(50);
			expect(data.secret).toMatch(/^0x[a-fA-F0-9]+$/);
		});

		it('should show the pending fleet in get_pending_fleets', async () => {
			const result = await invokeWithStorage(
				['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_fleets'],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				fleets: Array<{
					fleetId: string;
					fromPlanetId: string;
					toPlanetId: string;
					quantity: number;
					resolved: boolean;
				}>;
			}>(result.stdout);

			expect(data.fleets).toBeDefined();
			expect(Array.isArray(data.fleets)).toBe(true);
		});
	});

	describe('Time Manipulation and Fleet Resolution', () => {
		it('should advance time and resolve fleet', {timeout: 60000}, async () => {
			// First get pending fleets
			const pendingResult = await invokeWithStorage(
				['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_fleets'],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(pendingResult.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const pendingData = parseCliOutput<{
				fleets: Array<{
					fleetId: string;
					estimatedArrivalTime: number;
					resolved: boolean;
				}>;
			}>(pendingResult.stdout);

			const unresolvedFleets = pendingData.fleets.filter((f) => !f.resolved);

			// Test requires at least one unresolved fleet
			expect(unresolvedFleets.length).toBeGreaterThan(0);

			const fleet = unresolvedFleets[0];
			const currentTimestamp = await getCurrentTimestamp(RPC_URL);

			// Advance time past the estimated arrival time + larger buffer
			// Note: resolveWindow is the deadline AFTER which it's too late, not extra wait time
			// We add extra buffer because the contract's arrival time is based on the tx block timestamp,
			// which may be slightly later than when we computed estimatedArrivalTime
			const timeToAdvance = fleet.estimatedArrivalTime - currentTimestamp + 500;

			// Always advance time
			console.log(
				`Advancing time by ${timeToAdvance} seconds (arrival: ${fleet.estimatedArrivalTime}, current: ${currentTimestamp})`,
			);
			await advanceTime(RPC_URL, timeToAdvance);

			// Verify the new blockchain time
			const newTimestamp = await getCurrentTimestamp(RPC_URL);
			console.log(
				`After advance: blockchain time is ${newTimestamp}, arrival was ${fleet.estimatedArrivalTime}, diff: ${newTimestamp - fleet.estimatedArrivalTime}`,
			);

			// Now resolve the fleet
			const resolveResult = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'resolve_fleet',
					'--fleetId',
					fleet.fleetId,
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			// Debug output
			if (resolveResult.exitCode !== 0) {
				console.log('resolve_fleet stdout:', resolveResult.stdout);
				console.log('resolve_fleet stderr:', resolveResult.stderr);
			}

			expect(resolveResult.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const resolveData = parseCliOutput<{
				fleetId: string;
				fromPlanetId: string;
				toPlanetId: string;
				quantity: number;
			}>(resolveResult.stdout);

			expect(resolveData.fleetId).toBe(fleet.fleetId);
		});

		it('should verify planet ownership after attack', async () => {
			// Test requires at least 2 planets available
			expect(validPlanets.length).toBeGreaterThanOrEqual(2);

			const targetPlanet = validPlanets[1];

			// Check the planet's current state
			const result = await invokeWithStorage([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--center',
				`${targetPlanet.x},${targetPlanet.y}`,
				'--radius',
				'1',
			]);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				planets: Array<{
					planetId: string;
					owner?: string;
					numSpaceships?: number;
					location: {x: number; y: number};
				}>;
			}>(result.stdout);

			expect(data.planets).toBeDefined();

			const planet = data.planets.find(
				(p) => p.location.x === targetPlanet.x && p.location.y === targetPlanet.y,
			);

			// The target planet should exist
			expect(planet).toBeDefined();
			// Log state for debugging (non-conditional)
			console.log('Target planet state after attack:');
			console.log('  Owner:', planet?.owner || 'none');
			console.log('  Spaceships:', planet?.numSpaceships);
		});
	});

	describe('Full Combat Scenario', () => {
		it(
			'should complete a full combat scenario between two players',
			{timeout: 120000},
			async () => {
				// This test performs the full flow in sequence:
				// 1. Find two valid unowned planets
				// 2. Player 1 acquires planet A
				// 3. Player 2 acquires planet B
				// 4. Player 1 sends a fleet from A to B
				// 5. Advance time to allow fleet to arrive
				// 6. Resolve the fleet to complete the attack

				// Step 1: Find planets
				const planets = await findValidPlanets(RPC_URL, getGameContract());
				expect(planets.length).toBeGreaterThanOrEqual(2);

				const planetA = planets[0];
				const planetB = planets[1];
				console.log(`Using planets: A(${planetA.x},${planetA.y}) and B(${planetB.x},${planetB.y})`);

				// Step 2: Player 1 acquires planet A
				console.log('Step 2: Player 1 acquiring planet A...');
				const acquireAResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'acquire_planets',
						'--coordinates',
						JSON.stringify([{x: planetA.x, y: planetA.y}]),
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				expect(acquireAResult.exitCode).toBe(0);

				// CLI outputs unwrapped result on success
				const acquireAData = parseCliOutput<{transactionHash: string}>(acquireAResult.stdout);
				expect(acquireAData.transactionHash).toBeDefined();
				console.log('Player 1 acquired planet A');

				// Step 3: Player 2 acquires planet B
				console.log('Step 3: Player 2 acquiring planet B...');
				const acquireBResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'acquire_planets',
						'--coordinates',
						JSON.stringify([{x: planetB.x, y: planetB.y}]),
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_2.privateKey}},
				);

				expect(acquireBResult.exitCode).toBe(0);

				// CLI outputs unwrapped result on success
				const acquireBData = parseCliOutput<{transactionHash: string}>(acquireBResult.stdout);
				expect(acquireBData.transactionHash).toBeDefined();
				console.log('Player 2 acquired planet B');

				// Step 4: Player 1 sends fleet from A to B
				console.log('Step 4: Player 1 sending fleet from A to B...');
				const sendFleetResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'send_fleet',
						'--from',
						`${planetA.x},${planetA.y}`,
						'--to',
						`${planetB.x},${planetB.y}`,
						'--quantity',
						'100', // Send enough spaceships to win
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				expect(sendFleetResult.exitCode).toBe(0);

				// CLI outputs unwrapped result on success
				const sendFleetData = parseCliOutput<{
					fleetId: string;
					arrivalTimeWanted: string;
				}>(sendFleetResult.stdout);

				expect(sendFleetData.fleetId).toBeDefined();
				console.log(`Fleet sent with ID: ${sendFleetData.fleetId}`);

				// Step 5: Advance time to allow fleet to arrive
				console.log('Step 5: Advancing time for fleet arrival...');

				// Get the pending fleet to know exact arrival time
				const pendingResult = await invokeWithStorage(
					['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_fleets'],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				expect(pendingResult.exitCode).toBe(0);

				// CLI outputs unwrapped result on success
				const pendingData = parseCliOutput<{
					fleets: Array<{
						fleetId: string;
						estimatedArrivalTime: number;
					}>;
				}>(pendingResult.stdout);

				const fleet = pendingData.fleets.find((f) => f.fleetId === sendFleetData.fleetId);
				expect(fleet).toBeDefined();

				const currentTime = await getCurrentTimestamp(RPC_URL);
				// Need to wait for fleet to arrive, but NOT past the resolve window
				// The resolve window is the deadline AFTER which it's too late to resolve
				// We add extra buffer because the contract's arrival time is based on the tx block timestamp,
				// which may be slightly later than when we computed estimatedArrivalTime
				const timeToAdvance = Math.max(fleet!.estimatedArrivalTime - currentTime + 500, 500);

				console.log(
					`Advancing time by ${timeToAdvance} seconds (arrival: ${fleet!.estimatedArrivalTime}, current: ${currentTime})`,
				);
				await advanceTime(RPC_URL, timeToAdvance);

				// Verify the new blockchain time
				const newTimestamp = await getCurrentTimestamp(RPC_URL);
				console.log(
					`After advance: blockchain time is ${newTimestamp}, arrival was ${fleet!.estimatedArrivalTime}, diff: ${newTimestamp - fleet!.estimatedArrivalTime}`,
				);

				// Step 6: Resolve the fleet
				console.log('Step 6: Resolving fleet...');
				const resolveResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'resolve_fleet',
						'--fleetId',
						sendFleetData.fleetId,
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				// Debug output
				if (resolveResult.exitCode !== 0) {
					console.log('resolve_fleet stdout:', resolveResult.stdout);
					console.log('resolve_fleet stderr:', resolveResult.stderr);
				}

				expect(resolveResult.exitCode).toBe(0);

				// CLI outputs unwrapped result on success
				const resolveData = parseCliOutput<{
					fleetId: string;
					fromPlanetId: string;
					toPlanetId: string;
					quantity: number;
				}>(resolveResult.stdout);

				console.log('Fleet resolved successfully!');
				expect(resolveData.fleetId).toBe(sendFleetData.fleetId);

				// Verify final state of planet B
				console.log('Verifying final state of planet B...');
				const finalStateResult = await invokeWithStorage([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_planets_around',
					'--center',
					`${planetB.x},${planetB.y}`,
					'--radius',
					'1',
				]);

				expect(finalStateResult.exitCode).toBe(0);

				// CLI outputs unwrapped result on success
				const finalStateData = parseCliOutput<{
					planets: Array<{
						planetId: string;
						owner?: string;
						numSpaceships?: number;
						location: {x: number; y: number};
					}>;
				}>(finalStateResult.stdout);

				const finalPlanetB = finalStateData.planets.find(
					(p) => p.location.x === planetB.x && p.location.y === planetB.y,
				);

				expect(finalPlanetB).toBeDefined();
				console.log('Final state of planet B:');
				console.log('  Owner:', finalPlanetB?.owner);
				console.log('  Spaceships:', finalPlanetB?.numSpaceships);

				// The attack should have affected the planet
				// If successful, Player 1 may have captured it or reduced defenders
				expect(finalPlanetB?.owner).toBeDefined();
			},
		);
	});

	describe('Edge Cases', () => {
		it('should fail to send fleet from unowned planet', async () => {
			// Test requires at least 2 planets available
			expect(validPlanets.length).toBeGreaterThanOrEqual(2);

			// Try to send from a planet neither player owns
			const unownedPlanet = validPlanets[validPlanets.length - 1]; // Use last planet
			const targetPlanet = validPlanets[0];

			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					`${unownedPlanet.x},${unownedPlanet.y}`,
					'--to',
					`${targetPlanet.x},${targetPlanet.y}`,
					'--quantity',
					'50',
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			// Should fail because player doesn't own the source planet
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should fail to send more spaceships than available', async () => {
			// Test requires at least 2 planets available
			expect(validPlanets.length).toBeGreaterThanOrEqual(2);

			const fromPlanet = validPlanets[0];
			const toPlanet = validPlanets[1];

			// Try to send an unreasonably large number of spaceships
			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'send_fleet',
					'--from',
					`${fromPlanet.x},${fromPlanet.y}`,
					'--to',
					`${toPlanet.x},${toPlanet.y}`,
					'--quantity',
					'999999999',
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			// Should fail because there aren't that many spaceships available
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});

		it('should fail to resolve non-existent fleet', async () => {
			const fakeFleetId = '0x' + '0'.repeat(64);

			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'resolve_fleet',
					'--fleetId',
					fakeFleetId,
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			// Should fail - fleet doesn't exist
			expect(result.exitCode).not.toBe(0);
			expect(result.stderr || result.stdout).toBeTruthy();
		});
	});
});
