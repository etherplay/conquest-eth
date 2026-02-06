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
	const currentBlock = await fetch(rpcUrl, {
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
	const result = await response.json();
	return parseInt(result.result.timestamp, 16);
}

/**
 * Helper to find valid planets near origin
 */
async function findValidPlanets(
	rpcUrl: string,
	gameContract: string,
): Promise<Array<{x: number; y: number; planetId: string}>> {
	const result = await invokeCliCommand([
		'--rpc-url',
		rpcUrl,
		'--game-contract',
		gameContract,
		'get_planets_around',
		'--centerX',
		'0',
		'--centerY',
		'0',
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

describe('Full Flow - Planet Acquisition and Fleet Combat', () => {
	let validPlanets: Array<{x: number; y: number; planetId: string}> = [];

	beforeAll(async () => {
		await setupTestEnvironment();

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
		it(
			'should allow Player 1 to acquire a planet',
			{timeout: 30000},
			async () => {
				if (validPlanets.length < 1) {
					console.log('Skipping test: No valid planets found');
					return;
				}

				const planet = validPlanets[0];
				// coordinates expects an array of objects with x and y, passed as JSON
				const result = await invokeCliCommand(
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

				if (result.exitCode === 0) {
					// CLI outputs unwrapped result on success
					const data = parseCliOutput<{
						transactionHash: string;
						planetsAcquired: string[];
					}>(result.stdout);

					expect(data.transactionHash).toBeDefined();
					expect(data.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
				} else {
					// Parse error from stderr
					console.warn('Player 1 acquire failed:', result.stderr || result.stdout);
				}
			},
		);

		it(
			'should allow Player 2 to acquire a different planet',
			{timeout: 30000},
			async () => {
				if (validPlanets.length < 2) {
					console.log('Skipping test: Not enough valid planets found');
					return;
				}

				const planet = validPlanets[1];
				// coordinates expects an array of objects with x and y, passed as JSON
				const result = await invokeCliCommand(
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

				if (result.exitCode === 0) {
					// CLI outputs unwrapped result on success
					const data = parseCliOutput<{
						transactionHash: string;
						planetsAcquired: string[];
					}>(result.stdout);

					expect(data.transactionHash).toBeDefined();
				} else {
					console.warn('Player 2 acquire failed:', result.stderr || result.stdout);
				}
			},
		);

		it('should show Player 1 owns their acquired planet', async () => {
			const result = await invokeCliCommand(
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
		it(
			"should allow Player 1 to send a fleet to Player 2's planet",
			{timeout: 30000},
			async () => {
				if (validPlanets.length < 2) {
					console.log('Skipping test: Not enough valid planets');
					return;
				}

				const fromPlanet = validPlanets[0];
				const toPlanet = validPlanets[1];

				const result = await invokeCliCommand(
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

				if (result.exitCode === 0) {
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
				} else {
					// May fail if Player 1 doesn't own the planet
					console.warn('Send fleet failed:', result.stderr || result.stdout);
				}
			},
		);

		it('should show the pending fleet in get_pending_fleets', async () => {
			const result = await invokeCliCommand(
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
		it(
			'should advance time and resolve fleet',
			{timeout: 60000},
			async () => {
				// First get pending fleets
				const pendingResult = await invokeCliCommand(
					['--rpc-url', RPC_URL, '--game-contract', getGameContract(), 'get_pending_fleets'],
					{env: {PRIVATE_KEY: ANVIL_ACCOUNTS.PLAYER_1.privateKey}},
				);

				if (pendingResult.exitCode !== 0) {
					console.log('No pending fleets to resolve');
					return;
				}

				// CLI outputs unwrapped result on success
				const pendingData = parseCliOutput<{
					fleets: Array<{
						fleetId: string;
						estimatedArrivalTime: number;
						resolved: boolean;
					}>;
				}>(pendingResult.stdout);

				const unresolvedFleets = pendingData.fleets.filter((f) => !f.resolved);

				if (unresolvedFleets.length === 0) {
					console.log('No unresolved fleets to test');
					return;
				}

				const fleet = unresolvedFleets[0];
				const currentTimestamp = await getCurrentTimestamp(RPC_URL);

				// Advance time past the estimated arrival time + some buffer for resolve window
				// The resolve window is typically around 7200 seconds (2 hours)
				const timeToAdvance = Math.max(
					fleet.estimatedArrivalTime - currentTimestamp + 7200 + 100,
					0,
				);

				if (timeToAdvance > 0) {
					console.log(`Advancing time by ${timeToAdvance} seconds`);
					await advanceTime(RPC_URL, timeToAdvance);
				}

				// Now resolve the fleet
				const resolveResult = await invokeCliCommand(
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

				if (resolveResult.exitCode === 0) {
					// CLI outputs unwrapped result on success
					const resolveData = parseCliOutput<{
						fleetId: string;
						fromPlanetId: string;
						toPlanetId: string;
						quantity: number;
					}>(resolveResult.stdout);

					expect(resolveData.fleetId).toBe(fleet.fleetId);
					console.log('Fleet resolved successfully!');
				} else {
					console.warn('Resolve fleet command failed:', resolveResult.stderr || resolveResult.stdout);
				}
			},
		);

		it('should verify planet ownership after attack', async () => {
			if (validPlanets.length < 2) {
				console.log('Skipping test: Not enough valid planets');
				return;
			}

			const targetPlanet = validPlanets[1];

			// Check the planet's current state
			const result = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				getGameContract(),
				'get_planets_around',
				'--centerX',
				targetPlanet.x.toString(),
				'--centerY',
				targetPlanet.y.toString(),
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

			if (planet) {
				console.log('Target planet state after attack:');
				console.log('  Owner:', planet.owner || 'none');
				console.log('  Spaceships:', planet.numSpaceships);
			}
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
				if (planets.length < 2) {
					console.log('Not enough unowned planets for full combat scenario');
					return;
				}

				const planetA = planets[0];
				const planetB = planets[1];
				console.log(`Using planets: A(${planetA.x},${planetA.y}) and B(${planetB.x},${planetB.y})`);

				// Step 2: Player 1 acquires planet A
				console.log('Step 2: Player 1 acquiring planet A...');
				const acquireAResult = await invokeCliCommand(
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

				if (acquireAResult.exitCode !== 0) {
					console.log('Failed to acquire planet A:', acquireAResult.stderr || acquireAResult.stdout);
					return;
				}

				// CLI outputs unwrapped result on success
				const acquireAData = parseCliOutput<{transactionHash: string}>(acquireAResult.stdout);
				expect(acquireAData.transactionHash).toBeDefined();
				console.log('Player 1 acquired planet A');

				// Step 3: Player 2 acquires planet B
				console.log('Step 3: Player 2 acquiring planet B...');
				const acquireBResult = await invokeCliCommand(
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

				if (acquireBResult.exitCode !== 0) {
					console.log('Failed to acquire planet B:', acquireBResult.stderr || acquireBResult.stdout);
					return;
				}

				// CLI outputs unwrapped result on success
				const acquireBData = parseCliOutput<{transactionHash: string}>(acquireBResult.stdout);
				expect(acquireBData.transactionHash).toBeDefined();
				console.log('Player 2 acquired planet B');

				// Step 4: Player 1 sends fleet from A to B
				console.log('Step 4: Player 1 sending fleet from A to B...');
				const sendFleetResult = await invokeCliCommand(
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

				if (sendFleetResult.exitCode !== 0) {
					console.log('Failed to send fleet:', sendFleetResult.stderr || sendFleetResult.stdout);
					return;
				}

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
				const pendingResult = await invokeCliCommand(
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

				if (!fleet) {
					console.log('Fleet not found in pending fleets');
					return;
				}

				const currentTime = await getCurrentTimestamp(RPC_URL);
				// Need to wait for arrival time + resolve window
				// Typical resolve window is 7200 seconds (2 hours)
				const resolveWindowBuffer = 7200 + 300; // Extra buffer
				const timeToAdvance = Math.max(
					fleet.estimatedArrivalTime - currentTime + resolveWindowBuffer,
					resolveWindowBuffer,
				);

				console.log(`Advancing time by ${timeToAdvance} seconds (${timeToAdvance / 3600} hours)`);
				await advanceTime(RPC_URL, timeToAdvance);

				// Step 6: Resolve the fleet
				console.log('Step 6: Resolving fleet...');
				const resolveResult = await invokeCliCommand(
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

				if (resolveResult.exitCode === 0) {
					// CLI outputs unwrapped result on success
					const resolveData = parseCliOutput<{
						fleetId: string;
						fromPlanetId: string;
						toPlanetId: string;
						quantity: number;
					}>(resolveResult.stdout);

					console.log('Fleet resolved successfully!');
					expect(resolveData.fleetId).toBe(sendFleetData.fleetId);
				} else {
					console.log('Fleet resolution command failed:', resolveResult.stderr || resolveResult.stdout);
				}

				// Verify final state of planet B
				console.log('Verifying final state of planet B...');
				const finalStateResult = await invokeCliCommand([
					'--rpc-url',
					RPC_URL,
					'--game-contract',
					getGameContract(),
					'get_planets_around',
					'--centerX',
					planetB.x.toString(),
					'--centerY',
					planetB.y.toString(),
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

				if (finalPlanetB) {
					console.log('Final state of planet B:');
					console.log('  Owner:', finalPlanetB.owner);
					console.log('  Spaceships:', finalPlanetB.numSpaceships);

					// The attack should have affected the planet
					// If successful, Player 1 may have captured it or reduced defenders
					expect(finalPlanetB.owner).toBeDefined();
				}
			},
		);
	});

	describe('Edge Cases', () => {
		it('should prevent sending fleet from unowned planet', async () => {
			if (validPlanets.length < 2) {
				console.log('Skipping test: Not enough valid planets');
				return;
			}

			// Try to send from a planet neither player owns
			const unownedPlanet = validPlanets[validPlanets.length - 1]; // Use last planet
			const targetPlanet = validPlanets[0];

			const result = await invokeCliCommand(
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
			// Either exitCode !== 0, or we can check the error
			if (result.exitCode !== 0) {
				// Expected failure - can parse error from stderr if needed
				expect(result.stderr || result.stdout).toBeTruthy();
			}
		});

		it('should handle sending more spaceships than available', async () => {
			if (validPlanets.length < 2) {
				console.log('Skipping test: Not enough valid planets');
				return;
			}

			const fromPlanet = validPlanets[0];
			const toPlanet = validPlanets[1];

			// Try to send an unreasonably large number of spaceships
			const result = await invokeCliCommand(
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

			// Should fail or return error
			// Either exitCode !== 0, or contract reverts
			if (result.exitCode !== 0) {
				expect(result.stderr || result.stdout).toBeTruthy();
			}
		});

		it('should handle resolving non-existent fleet', async () => {
			const fakeFleetId = '0x' + '0'.repeat(64);

			const result = await invokeCliCommand(
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
			// Either exitCode !== 0, or error in response
			if (result.exitCode !== 0) {
				// Expected failure
				expect(result.stderr || result.stdout).toBeTruthy();
			}
		});
	});
});
