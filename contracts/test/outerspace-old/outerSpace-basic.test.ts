// Test for OuterSpace basic functionality
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {encodeAbiParameters} from 'viem';
import {network} from 'hardhat';
import {setupOuterSpaceFixtures} from '../fixtures/setupFixtures.js';
import {sendInSecret, fetchPlanetState, convertPlanetCallData} from './utils.js';

describe('OuterSpace Basic', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const { provider, networkHelpers: nh } = await network.connect();
		networkHelpers = nh;
		const fixtures = setupOuterSpaceFixtures(provider);
		deployAll = fixtures.deployAll;
	});

	it('user can acquire virgin planet', async function () {
		const { env, OuterSpace, ConquestCredits, spaceInfo, unnamedAccounts } = 
			await networkHelpers.loadFixture(deployAll);
		
		const pointer = spaceInfo.findNextPlanet();
		const player = unnamedAccounts[0];
		
		const amount = BigInt(pointer.data.stats.stake) * 1000000000000000000n;
		const hash = await env.execute(ConquestCredits, {
			functionName: 'transferAndCall',
			args: [
				OuterSpace.address,
				amount,
				encodeAbiParameters(
					[{type: 'address'}, {type: 'uint256'}],
					[player, pointer.data.location.id],
				),
			],
			account: player,
		});
		const receipt = await env.viem.publicClient.waitForTransactionReceipt({hash});
		
		assert.ok(receipt, 'Transaction receipt should exist');
	});

	it('user cannot acquire planet already owned by another player', async function () {
		const { env, OuterSpace, ConquestCredits, spaceInfo, unnamedAccounts } = 
			await networkHelpers.loadFixture(deployAll);
		
		const pointer = spaceInfo.findNextPlanet();
		const player0 = unnamedAccounts[0];
		const player1 = unnamedAccounts[1];
		
		const amount = BigInt(pointer.data.stats.stake) * 1000000000000000000n;
		
		// First player acquires planet
		const hash1 = await env.execute(ConquestCredits, {
			functionName: 'transferAndCall',
			args: [
				OuterSpace.address,
				amount,
				encodeAbiParameters(
					[{type: 'address'}, {type: 'uint256'}],
					[player0, pointer.data.location.id],
				),
			],
			account: player0,
		});
		await env.viem.publicClient.waitForTransactionReceipt({hash: hash1});

		// Second player tries to acquire same planet
		await assert.rejects(
			env.execute(ConquestCredits, {
				functionName: 'transferAndCall',
				args: [
					OuterSpace.address,
					amount,
					encodeAbiParameters(
						[{type: 'address'}, {type: 'uint256'}],
						[player1, pointer.data.location.id],
					),
				],
				account: player1,
			}),
			/STILL_ACTIVE|expected to revert/,
			'Second player should not be able to acquire already owned planet',
		);
	});

	it("user can attack other player's planet", async function () {
		const { env, OuterSpace, ConquestCredits, spaceInfo, unnamedAccounts } = 
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
		
		const amount0 = BigInt(planet0.stats.stake) * 1000000000000000000n;
		const hash0 = await env.execute(ConquestCredits, {
			functionName: 'transferAndCall',
			args: [
				OuterSpace.address,
				amount0,
				encodeAbiParameters(
					[{type: 'address'}, {type: 'uint256'}],
					[player0, planet0.location.id],
				),
			],
			account: player0,
		});
		await env.viem.publicClient.waitForTransactionReceipt({hash: hash0});
		
		const amount1 = BigInt(planet1.stats.stake) * 1000000000000000000n;
		const hash1 = await env.execute(ConquestCredits, {
			functionName: 'transferAndCall',
			args: [
				OuterSpace.address,
				amount1,
				encodeAbiParameters(
					[{type: 'address'}, {type: 'uint256'}],
					[player1, planet1.location.id],
				),
			],
			account: player1,
		});
		await env.viem.publicClient.waitForTransactionReceipt({hash: hash1});
		
		planet0 = await fetchPlanetState(env, OuterSpace, planet0);
		planet1 = await fetchPlanetState(env, OuterSpace, planet1);

		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const quantity = planet1.getNumSpaceships(block!.timestamp);
		console.log({quantity, blockTime: block!.timestamp});
		
		const sent = await sendInSecret(
			env,
			OuterSpace,
			spaceInfo,
			player1,
			{
				from: planet1,
				quantity,
				to: planet0,
			},
		);
		
		if (!sent) {
			throw new Error('no fleet found');
		}
		
		const { fleetId, secret, from, to, distance, timeRequired } = sent;
		
		await networkHelpers.time.increase(timeRequired);

		const allianceAddress = '0x0000000000000000000000000000000000000000';

		const hash = await env.execute(OuterSpace, {
			functionName: 'resolveFleet',
			args: [
				BigInt(from),
				BigInt(to),
				BigInt(distance),
				allianceAddress,
				secret,
			],
			account: player1,
		});
		const receipt = await env.viem.publicClient.waitForTransactionReceipt({hash});
		
		assert.ok(receipt, 'Fleet resolution should succeed');
	});

	it('planet production matches estimates', async function () {
		const { env, OuterSpace, ConquestCredits, spaceInfo, unnamedAccounts } = 
			await networkHelpers.loadFixture(deployAll);
		
		const player = unnamedAccounts[0];
		
		let planet = await fetchPlanetState(
			env,
			OuterSpace,
			spaceInfo.findNextPlanet().data,
		);
		
		const amount = BigInt(planet.stats.stake) * 1000000000000000000n;
		const hash = await env.execute(ConquestCredits, {
			functionName: 'transferAndCall',
			args: [
				OuterSpace.address,
				amount,
				encodeAbiParameters(
					[{type: 'address'}, {type: 'uint256'}],
					[player, planet.location.id],
				),
			],
			account: player,
		});
		await env.viem.publicClient.waitForTransactionReceipt({hash});
		
		planet = await fetchPlanetState(env, OuterSpace, planet);
		
		const block = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const firstTime = block!.timestamp;
		console.log({firstTime});
		
		await sendInSecret(
			env,
			OuterSpace,
			spaceInfo,
			player,
			{
				from: planet,
				quantity: planet.getNumSpaceships(firstTime),
				to: planet,
			},
		);
		
		await networkHelpers.time.increase(1000);
		
		const block2 = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const currentTime = block2!.timestamp;
		
		const new_planet = await fetchPlanetState(env, OuterSpace, planet);
		const quantity = new_planet.getNumSpaceships(currentTime);
		console.log({quantity, currentTime});
		
		await sendInSecret(
			env,
			OuterSpace,
			spaceInfo,
			player,
			{
				from: planet,
				quantity,
				to: planet,
			},
		);
		
		const block3 = await env.viem.publicClient.getBlock({blockTag: 'latest'});
		const currentTimeAgain = block3!.timestamp;
		
		const new_planet_again = await fetchPlanetState(env, OuterSpace, planet);
		const quantityAgain = new_planet_again.getNumSpaceships(currentTimeAgain);
		console.log({quantityAgain, currentTimeAgain});
		
		// Try to send more ships than available - should fail
		await assert.rejects(
			sendInSecret(
				env,
				OuterSpace,
				spaceInfo,
				player,
				{
					from: planet,
					quantity: quantityAgain + 2,
					to: planet,
				},
			),
			/expected to revert/,
			'Should not be able to send more ships than available',
		);
	});
});