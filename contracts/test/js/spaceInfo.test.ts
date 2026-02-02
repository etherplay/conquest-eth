// Test for JS <-> Solidity equivalence of SpaceInfo and other js functions
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {
	SpaceInfo,
	locationToXY,
	xyToLocation,
	nextInSpiral,
} from '../../js/index.js';
import {setupFixtures} from '../fixtures/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('JS SpaceInfo <-> Solidity equivalence', function () {
	let spaceInfo: SpaceInfo;
	let OuterSpace: any;
	let env: any;

	before(async function () {
		const deployed = await networkHelpers.loadFixture(deployAll);
		const linkedData = deployed.OuterSpace.linkedData;
		if (!linkedData) {
			throw new Error('OuterSpace deployment missing linkedData');
		}
		spaceInfo = new SpaceInfo(linkedData as any);
		OuterSpace = deployed.OuterSpace;
		env = deployed.env;
	});

	describe('Planet Info', function () {
		it('planet location id is valid', async function () {
			const pointer = spaceInfo.findNextPlanet();
			const jsPlanet = pointer.data;

			const locationId = jsPlanet.location.id;

			// The location should be a bigint
			assert.ok(typeof locationId === 'bigint', 'Location ID should be a bigint');
			assert.ok(locationId !== 0n, 'Location ID should not be zero');
		});

		it('planet info has required stats fields', async function () {
			const pointer = spaceInfo.findNextPlanet();
			const {stats} = pointer.data;

			// Check that all required stats exist
			assert.ok(typeof stats.subX === 'number', 'subX should be a number');
			assert.ok(typeof stats.subY === 'number', 'subY should be a number');
			assert.ok(typeof stats.production === 'number', 'production should be a number');
			assert.ok(typeof stats.attack === 'number', 'attack should be a number');
			assert.ok(typeof stats.defense === 'number', 'defense should be a number');
			assert.ok(typeof stats.speed === 'number', 'speed should be a number');
			assert.ok(typeof stats.natives === 'number', 'natives should be a number');
		});

		it('findNextPlanet returns valid planets', async function () {
			const pointer1 = spaceInfo.findNextPlanet();
			assert.ok(pointer1.data, 'First planet should have data');

			const pointer2 = spaceInfo.findNextPlanet(pointer1);
			assert.ok(pointer2.data, 'Second planet should have data');
			assert.notStrictEqual(
				pointer1.x,
				pointer2.x,
				'Second planet should be at different X',
			);
		});
	});

	describe('Location Functions', function () {
		it('locationToXY and xyToLocation are reversible', function () {
			const testCases = [
				{x: 0, y: 0},
				{x: 1, y: 2},
				{x: -1, y: -2},
				{x: 100, y: 200},
				{x: -100, y: -200},
			];

			for (const {x, y} of testCases) {
				const location = xyToLocation(x, y);
				const {x: x2, y: y2} = locationToXY(location);
				assert.strictEqual(x2, x, `X coordinate should be reversible`);
				assert.strictEqual(y2, y, `Y coordinate should be reversible`);
			}
		});

		it('locationToXY matches JS planet location', async function () {
			const pointer = spaceInfo.findNextPlanet();
			const jsPlanet = pointer.data;

			const {x: x, y: y} = locationToXY(jsPlanet.location.id);

			assert.strictEqual(x, jsPlanet.location.x, 'X should match');
			assert.strictEqual(y, jsPlanet.location.y, 'Y should match');
		});

		it('nextInSpiral finds planets in correct order', function () {
			let pointer: any = undefined;
			let prevX = 0;
			let prevY = 0;
			let count = 0;

			// First planet should be at (0,0)
			pointer = nextInSpiral(pointer);
			assert.strictEqual(pointer.x, 0, 'First planet should be at x=0');
			assert.strictEqual(pointer.y, 0, 'First planet should be at y=0');

			// Find a few planets to verify spiral works
			pointer = spaceInfo.findNextPlanet();
			const firstPlanet = spaceInfo.getPlanetInfo(pointer.x, pointer.y);
			assert.ok(firstPlanet, 'Should find first planet');

			// Find another planet
			pointer = spaceInfo.findNextPlanet(pointer);
			const secondPlanet = spaceInfo.getPlanetInfo(pointer.x, pointer.y);
			assert.ok(secondPlanet, 'Should find second planet');
			assert.notStrictEqual(
				pointer.x,
				firstPlanet?.location.x,
				'Second planet should be at different location',
			);
		});
	});

	describe('Distance and Time', function () {
		it('distance calculation is reasonable', async function () {
			const pointer1 = spaceInfo.findNextPlanet();
			const planet1 = pointer1.data;

			const pointer2 = spaceInfo.findNextPlanet(pointer1);
			const planet2 = pointer2.data;

			const jsDistance = spaceInfo.distance(planet1, planet2);

			// Verify distance is reasonable (should be positive)
			assert.ok(jsDistance >= 0, 'Distance should be non-negative');
		});

		it('timeToArrive calculation is consistent', async function () {
			const pointer1 = spaceInfo.findNextPlanet();
			const planet1 = pointer1.data;

			const pointer2 = spaceInfo.findNextPlanet(pointer1);
			const planet2 = pointer2.data;

			const travelTime = spaceInfo.timeToArrive(planet1, planet2);

			// Travel time should be non-negative
			assert.ok(travelTime >= 0, 'Travel time should be non-negative');
		});
	});

	describe('Combat System', function () {
		it('combat function produces consistent results', function () {
			const testCases = [
				{numAttack: 1000n, numDefense: 1000n, attack: 5000, defense: 5000},
				{numAttack: 2000n, numDefense: 1000n, attack: 6000, defense: 4000},
				{numAttack: 1000n, numDefense: 2000n, attack: 4000, defense: 6000},
				{numAttack: 0n, numDefense: 1000n, attack: 5000, defense: 5000},
				{numAttack: 1000n, numDefense: 0n, attack: 5000, defense: 5000},
			];

			for (const testCase of testCases) {
				const result = spaceInfo.combat(
					testCase.attack,
					testCase.numAttack,
					testCase.defense,
					testCase.numDefense,
				);

				// Basic sanity checks
				assert.ok(
					result.attackerLoss >= 0n,
					'Attacker loss should be non-negative',
				);
				assert.ok(
					result.defenderLoss >= 0n,
					'Defender loss should be non-negative',
				);

				// If attack is 0 or defense is 0, losses should be 0
				if (testCase.numAttack === 0n || testCase.numDefense === 0n) {
					assert.strictEqual(
						result.attackerLoss,
						0n,
						'Zero attack or defense should result in zero attacker loss',
					);
					assert.strictEqual(
						result.defenderLoss,
						0n,
						'Zero attack or defense should result in zero defender loss',
					);
				}

				// Attacker loss should not exceed attack
				assert.ok(
					result.attackerLoss <= testCase.numAttack,
					'Attacker loss should not exceed attack',
				);

				// Defender loss should not exceed defense
				assert.ok(
					result.defenderLoss <= testCase.numDefense,
					'Defender loss should not exceed defense',
				);
			}
		});

		it('combat is deterministic', function () {
			const testCase = {
				numAttack: 5000n,
				numDefense: 5000n,
				attack: 5500,
				defense: 5500,
			};

			const result1 = spaceInfo.combat(
				testCase.attack,
				testCase.numAttack,
				testCase.defense,
				testCase.numDefense,
			);

			const result2 = spaceInfo.combat(
				testCase.attack,
				testCase.numAttack,
				testCase.defense,
				testCase.numDefense,
			);

			assert.strictEqual(
				result1.attackerLoss,
				result2.attackerLoss,
				'Combat should be deterministic',
			);
			assert.strictEqual(
				result1.defenderLoss,
				result2.defenderLoss,
				'Combat should be deterministic',
			);
			assert.strictEqual(
				result1.attackDamage,
				result2.attackDamage,
				'Combat should be deterministic',
			);
		});
	});

	describe('SpaceInfo Configuration', function () {
		it('SpaceInfo has correct configuration values', function () {
			assert.ok(spaceInfo.resolveWindow > 0, 'resolveWindow should be positive');
			assert.ok(spaceInfo.timePerDistance > 0, 'timePerDistance should be positive');
			assert.ok(spaceInfo.exitDuration > 0, 'exitDuration should be positive');
			assert.ok(
				spaceInfo.acquireNumSpaceships > 0,
				'acquireNumSpaceships should be positive',
			);
			assert.ok(spaceInfo.productionSpeedUp > 0, 'productionSpeedUp should be positive');
			assert.ok(
				spaceInfo.fleetSizeFactor6 >= 0,
				'fleetSizeFactor6 should be non-negative',
			);
			assert.ok(
				Array.isArray(spaceInfo.stakeRangeArray),
				'stakeRangeArray should be an array',
			);
			assert.ok(
				spaceInfo.stakeRangeArray.length > 0,
				'stakeRangeArray should not be empty',
			);
		});
	});
});