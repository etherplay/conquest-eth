// Test for OuterSpace contract - planet acquisition
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {acquire, fetchPlanetState, sendInSecret} from './utils.js';
import {setupFixtures} from '../fixtures/index.js';
import {SpaceInfo} from '../../js/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('OuterSpace', function () {
	it('user can acquire virgin planet', async function () {
		const {env, OuterSpace, PlayToken, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const spaceInfo = new SpaceInfo(OuterSpace.linkedData as any);
		const pointer = spaceInfo.findNextPlanet();
		const player = unnamedAccounts[0];

		const receipt = await acquire(
			env,
			OuterSpace,
			PlayToken,
			player,
			pointer.data,
		);

		assert.ok(receipt, 'Transaction receipt should exist');
		assert.ok(receipt.logs, 'Transaction should have logs');
	});

	it('user cannot acquire planet already owned by another player', async function () {
		const {env, OuterSpace, PlayToken, spaceInfo, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const pointer = spaceInfo.findNextPlanet();
		const player0 = unnamedAccounts[0];
		const player1 = unnamedAccounts[1];

		const amount = BigInt(pointer.data.stats.stake) * 1000000000000000000n;

		// First player acquires planet
		const receipt1 = await acquire(
			env,
			OuterSpace,
			PlayToken,
			player0,
			pointer.data,
		);

		// Second player tries to acquire same planet
		await assert.rejects(
			acquire(env, OuterSpace, PlayToken, player1, pointer.data),
			'Second player should not be able to acquire already owned planet',
		);
	});

	it("user can attack other player's planet", async function () {
		const {env, OuterSpace, PlayToken, spaceInfo, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const player0 = unnamedAccounts[0];
		const player1 = unnamedAccounts[1];

		const p0 = spaceInfo.findNextPlanet();
		let planet0 = await fetchPlanetState(env, OuterSpace, p0.data);
		let planet1 = await fetchPlanetState(
			env,
			OuterSpace,
			spaceInfo.findNextPlanet(p0).data,
		);

		// First player acquires planet
		const receipt0 = await acquire(
			env,
			OuterSpace,
			PlayToken,
			player0,
			planet0,
		);

		// Second player acquires planet
		const receipt1 = await acquire(
			env,
			OuterSpace,
			PlayToken,
			player1,
			planet1,
		);

		planet0 = await fetchPlanetState(env, OuterSpace, planet0);
		planet1 = await fetchPlanetState(env, OuterSpace, planet1);

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const quantity = planet1.getNumSpaceships(block!.timestamp);
		console.log({quantity, blockTime: block!.timestamp});

		const {
			fleetId,
			secret,
			from,
			to,
			distance,
			timeRequired,
			arrivalTimeWanted,
			gift,
			specific,
			fleetSender,
			operator,
		} = await sendInSecret(env, OuterSpace, spaceInfo, player1, {
			from: planet1,
			quantity,
			to: planet0,
		});

		await networkHelpers.time.increase(timeRequired);

		const receipt = await env.execute(OuterSpace, {
			functionName: 'resolveFleet',
			args: [
				BigInt(fleetId),
				{
					from: BigInt(from),
					to: BigInt(to),
					distance: BigInt(distance),
					arrivalTimeWanted,
					gift,
					specific,
					secret,
					fleetSender,
					operator,
				},
			],
			account: player1,
		});

		assert.ok(receipt, 'Fleet resolution should succeed');
	});

	it('planet production matches estimates', async function () {
		const {env, OuterSpace, PlayToken, spaceInfo, unnamedAccounts} =
			await networkHelpers.loadFixture(deployAll);

		const player = unnamedAccounts[0];

		let planet = await fetchPlanetState(
			env,
			OuterSpace,
			spaceInfo.findNextPlanet().data,
		);

		const amount = BigInt(planet.stats.stake) * 1000000000000000000n;
		const receipt = await acquire(env, OuterSpace, PlayToken, player, planet);

		planet = await fetchPlanetState(env, OuterSpace, planet);

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const firstTime = block!.timestamp;
		console.log({firstTime});

		await sendInSecret(env, OuterSpace, spaceInfo, player, {
			from: planet,
			quantity: planet.getNumSpaceships(firstTime),
			to: planet,
		});

		await networkHelpers.time.increase(1000);

		const block2 = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const currentTime = block2!.timestamp;

		const new_planet = await fetchPlanetState(env, OuterSpace, planet);
		const quantity = new_planet.getNumSpaceships(currentTime);
		console.log({quantity, currentTime});

		await sendInSecret(env, OuterSpace, spaceInfo, player, {
			from: planet,
			quantity,
			to: planet,
		});

		const block3 = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const currentTimeAgain = block3!.timestamp;

		const new_planet_again = await fetchPlanetState(env, OuterSpace, planet);
		const quantityAgain = new_planet_again.getNumSpaceships(currentTimeAgain);
		console.log({quantityAgain, currentTimeAgain});

		// Try to send more ships than available - should fail
		await assert.rejects(
			sendInSecret(env, OuterSpace, spaceInfo, player, {
				from: planet,
				quantity: quantityAgain + 2,
				to: planet,
			}),
			'Should not be able to send more ships than available',
		);
	});
});
