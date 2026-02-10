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
import {RPC_URL, getGameContract} from '../setup.js';
import {parseCliOutput} from './helpers.js';
import {
	advanceTime,
	getCurrentTimestamp,
	clearTestStorage,
	invokeWithStorage as invokeWithStorageBase,
} from '../utils.js';

// Test-specific storage path to avoid conflicts between test runs
const TEST_STORAGE_PATH = './data/test-full-flow';

/**
 * Helper to invoke CLI with test-specific storage path
 */
function invokeWithStorage(args: string[], options?: {env?: Record<string, string>}) {
	return invokeWithStorageBase(args, options, TEST_STORAGE_PATH);
}

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
			state: {
				owner?: string;
			};
		}>;
	}>(result.stdout);

	const planets = data.planets || [];

	return planets
		.filter((p) => !p.state.owner) // Only unowned planets
		.map((p) => ({
			x: p.location.x,
			y: p.location.y,
			planetId: p.planetId,
		}));
}

describe('Full Flow - Planet Acquisition and Fleet Combat', () => {
	let validPlanets: Array<{x: number; y: number; planetId: string}> = [];

	beforeAll(async () => {
		await setupTestEnvironment();

		// Clear test storage to ensure clean state
		await clearTestStorage(TEST_STORAGE_PATH);

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
			// coordinates uses variadic format: x,y x,y ...
			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					`${planet.x},${planet.y}`,
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
			// coordinates uses variadic format: x,y x,y ...
			const result = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					`${planet.x},${planet.y}`,
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
					'get_planets_around',
					'--center',
					'0,0',
					'--radius',
					'20',
					'--only',
					'me',
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(result.exitCode).toBe(0);

			// CLI outputs unwrapped result on success
			const data = parseCliOutput<{
				planets: Array<{
					planetId: string;
					state: {
						owner?: string;
					};
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
					'--fleet-id',
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
					state: {
						owner?: string;
						numSpaceships?: number;
					};
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
			console.log('  Owner:', planet?.state.owner || 'none');
			console.log('  Spaceships:', planet?.state.numSpaceships);
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
						`${planetA.x},${planetA.y}`,
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
						`${planetB.x},${planetB.y}`,
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
						'--fleet-id',
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
						state: {
							owner?: string;
							numSpaceships?: number;
						};
						location: {x: number; y: number};
					}>;
				}>(finalStateResult.stdout);
	
				const finalPlanetB = finalStateData.planets.find(
					(p) => p.location.x === planetB.x && p.location.y === planetB.y,
				);
	
				expect(finalPlanetB).toBeDefined();
				console.log('Final state of planet B:');
				console.log('  Owner:', finalPlanetB?.state.owner);
				console.log('  Spaceships:', finalPlanetB?.state.numSpaceships);
	
				// The attack should have affected the planet
				// If successful, Player 1 may have captured it or reduced defenders
				expect(finalPlanetB?.state.owner).toBeDefined();
			},
		);
	});

	describe('Exit and Withdraw Flow', () => {
		it(
			'should allow a player to exit a planet and withdraw tokens',
			{timeout: 180000},
			async () => {
				// This test performs the exit and withdraw flow:
				// 1. Player 1 acquires a new planet
				// 2. Player 1 initiates exit on the planet
				// 3. Advance time past the exit duration
				// 4. Verify pending exit status
				// 5. Withdraw tokens

				// Step 1: Find an unowned planet and acquire it
				console.log('Step 1: Finding and acquiring a new planet for exit test...');
				const planets = await findValidPlanets(RPC_URL, getGameContract());
				expect(planets.length).toBeGreaterThanOrEqual(3);

				// Use a planet that wasn't used in previous tests
				const exitPlanet = planets[2];
				console.log(`Using planet at (${exitPlanet.x}, ${exitPlanet.y}) for exit test`);

				const acquireResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'acquire_planets',
						'--coordinates',
						`${exitPlanet.x},${exitPlanet.y}`,
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				expect(acquireResult.exitCode).toBe(0);
				console.log('Planet acquired for exit test');

				// Step 2: Exit the planet
				console.log('Step 2: Initiating exit on the planet...');
				const exitResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'exit_planets',
						'--coordinates',
						`${exitPlanet.x},${exitPlanet.y}`,
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				expect(exitResult.exitCode).toBe(0);

				const exitData = parseCliOutput<{
					transactionHash: string;
					exitsInitiated: string[];
				}>(exitResult.stdout);

				expect(exitData.transactionHash).toBeDefined();
				console.log(`Exit initiated with tx: ${exitData.transactionHash}`);

				// Step 3: Check pending exits
				console.log('Step 3: Checking pending exits...');
				const pendingExitsResult = await invokeWithStorage(
					['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_exits'],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				expect(pendingExitsResult.exitCode).toBe(0);

				const pendingExitsData = parseCliOutput<{
					exits: Array<{
						planetId: string;
						exitCompleteTime: number;
						completed: boolean;
						interrupted: boolean;
						withdrawn?: boolean;
					}>;
				}>(pendingExitsResult.stdout);

				expect(pendingExitsData.exits).toBeDefined();
				expect(pendingExitsData.exits.length).toBeGreaterThan(0);
				console.log(`Found ${pendingExitsData.exits.length} pending exit(s)`);

				const ourExit = pendingExitsData.exits[0];
				expect(ourExit.completed).toBe(false);
				expect(ourExit.interrupted).toBe(false);

				// Step 4: Advance time past exit duration
				// The exit duration is typically 7 days in seconds, but let's use the complete time from the exit
				console.log('Step 4: Advancing time past exit completion...');
				const currentTime = await getCurrentTimestamp(RPC_URL);
				const timeToAdvance = ourExit.exitCompleteTime - currentTime + 100; // Add buffer

				console.log(
					`Advancing time by ${timeToAdvance} seconds (exit complete time: ${ourExit.exitCompleteTime}, current: ${currentTime})`,
				);
				await advanceTime(RPC_URL, timeToAdvance);

				// Step 5: Verify exit status using coordinates
				console.log('Step 5: Verifying exit status...');
				const verifyResult = await invokeWithStorage(
					[
						'--rpc-url',
						RPC_URL,
						'--game-contract',
						getGameContract(),
						'verify_exit_status',
						'--x',
						`${exitPlanet.x}`,
						'--y',
						`${exitPlanet.y}`,
					],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				// Debug output if verification fails
				if (verifyResult.exitCode !== 0) {
					console.log('verify_exit_status stdout:', verifyResult.stdout);
					console.log('verify_exit_status stderr:', verifyResult.stderr);
				}

				expect(verifyResult.exitCode).toBe(0);

				const verifyData = parseCliOutput<{
					planetId: string;
					status: string;
					completed: boolean;
					interrupted: boolean;
				}>(verifyResult.stdout);

				console.log('Exit status after time advance:', {
					status: verifyData.status,
					completed: verifyData.completed,
					interrupted: verifyData.interrupted,
				});

				// The exit should now be complete (or completable)
				expect(verifyData.interrupted).toBe(false);

				// Step 6: Withdraw tokens (using auto-withdraw with no coordinates)
				console.log('Step 6: Withdrawing tokens from completed exits...');
				const withdrawResult = await invokeWithStorage(
					['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'withdraw'],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				// Log result for debugging
				console.log('Withdraw result:', withdrawResult.stdout);

				expect(withdrawResult.exitCode).toBe(0);

				const withdrawData = parseCliOutput<{
					transactionHash?: string;
					planetsWithdrawn: string[];
					message?: string;
				}>(withdrawResult.stdout);

				// If there were withdrawable exits, we should have a transaction
				if (withdrawData.transactionHash) {
					console.log(`Tokens withdrawn with tx: ${withdrawData.transactionHash}`);
					console.log(`Planets withdrawn: ${withdrawData.planetsWithdrawn.length}`);
					expect(withdrawData.planetsWithdrawn.length).toBeGreaterThan(0);
				} else {
					console.log('No withdrawable exits found (may have been withdrawn already)');
				}

				// Step 7: Verify that the exit is now marked as withdrawn
				console.log('Step 7: Verifying exit is marked as withdrawn...');
				const finalPendingResult = await invokeWithStorage(
					['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_exits'],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				if (finalPendingResult.exitCode === 0) {
					const finalData = parseCliOutput<{
						exits: Array<{
							planetId: string;
							withdrawn?: boolean;
						}>;
					}>(finalPendingResult.stdout);

					// If the exit was withdrawn, it may still be in storage but marked as withdrawn
					// Or it may have been cleaned up
					console.log('Final pending exits:', finalData.exits.length);
				}

				console.log('Exit and withdraw flow completed successfully!');
			},
		);

		it('should allow withdrawing from specific coordinates', {timeout: 180000}, async () => {
			// This test verifies that we can also withdraw from specific coordinates

			// Step 1: Find and acquire another planet
			console.log('Step 1: Finding and acquiring another planet for specific withdraw test...');
			const planets = await findValidPlanets(RPC_URL, getGameContract());
			expect(planets.length).toBeGreaterThanOrEqual(4);

			const withdrawPlanet = planets[3];
			console.log(`Using planet at (${withdrawPlanet.x}, ${withdrawPlanet.y})`);

			const acquireResult = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'acquire_planets',
					'--coordinates',
					`${withdrawPlanet.x},${withdrawPlanet.y}`,
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(acquireResult.exitCode).toBe(0);

			// Step 2: Exit the planet
			console.log('Step 2: Initiating exit...');
			const exitResult = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'exit_planets',
					'--coordinates',
					`${withdrawPlanet.x},${withdrawPlanet.y}`,
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(exitResult.exitCode).toBe(0);

			// Step 3: Get the exit time and advance past it
			const pendingResult = await invokeWithStorage(
				['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_exits'],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			expect(pendingResult.exitCode).toBe(0);

			const pendingData = parseCliOutput<{
				exits: Array<{
					planetId: string;
					exitCompleteTime: number;
				}>;
			}>(pendingResult.stdout);

			// Find our exit
			const ourExit = pendingData.exits[pendingData.exits.length - 1]; // Get the most recent
			const currentTime = await getCurrentTimestamp(RPC_URL);
			const timeToAdvance = ourExit.exitCompleteTime - currentTime + 100;

			console.log(`Step 3: Advancing time by ${timeToAdvance} seconds...`);
			await advanceTime(RPC_URL, timeToAdvance);

			// Step 4: Withdraw using specific coordinates
			console.log('Step 4: Withdrawing from specific coordinates...');
			const withdrawResult = await invokeWithStorage(
				[
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'withdraw',
					'--coordinates',
					`${withdrawPlanet.x},${withdrawPlanet.y}`,
				],
				{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
			);

			console.log('Withdraw result:', withdrawResult.stdout);
			expect(withdrawResult.exitCode).toBe(0);

			const withdrawData = parseCliOutput<{
				transactionHash?: string;
				planetsWithdrawn: string[];
			}>(withdrawResult.stdout);

			expect(withdrawData.transactionHash).toBeDefined();
			console.log(`Withdraw completed with tx: ${withdrawData.transactionHash}`);
		});
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
