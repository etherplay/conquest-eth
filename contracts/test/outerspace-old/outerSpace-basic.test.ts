// Test for OuterSpace basic functionality
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {encodeAbiParameters} from 'viem';
import {setupOuterSpace, sendInSecret, fetchPlanetState} from './utils.js';
import {expectRevert} from '../test-utils.js';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';

describe('OuterSpace Basic', function () {
	let fixture: Awaited<ReturnType<typeof setupOuterSpace>>;

	before(async () => {
		const env = await loadAndExecuteDeploymentsFromFiles();
		fixture = await setupOuterSpace(env);
	});

	it('user can acquire virgin planet', async function () {
		const {players, spaceInfo, outerSpaceContract} = fixture;
		const pointer = spaceInfo.findNextPlanet();
		
		const amount = BigInt(pointer.data.stats.stake) * 1000000000000000000n;
		const hash = await players[0].ConquestToken.write.transferAndCall([
			outerSpaceContract.address,
			amount,
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}],
				[players[0].address, pointer.data.location.id],
			),
		]);
		const receipt = await fixture.env?.publicClient?.waitForTransactionReceipt({hash});
		
		assert.ok(receipt, 'Transaction receipt should exist');
	});

	it('user cannot acquire planet already owned by another player', async function () {
		const {players, spaceInfo, outerSpaceContract} = fixture;
		const pointer = spaceInfo.findNextPlanet();
		
		const amount = BigInt(pointer.data.stats.stake) * 1000000000000000000n;
		
		// First player acquires planet
		const hash1 = await players[0].ConquestToken.write.transferAndCall([
			outerSpaceContract.address,
			amount,
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}],
				[players[0].address, pointer.data.location.id],
			),
		]);
		await fixture.env?.publicClient?.waitForTransactionReceipt({hash: hash1});

		// Second player tries to acquire same planet
		await assert.rejects(
			players[1].ConquestToken.write.transferAndCall([
				outerSpaceContract.address,
				amount,
				encodeAbiParameters(
					[{type: 'address'}, {type: 'uint256'}],
					[players[1].address, pointer.data.location.id],
				),
			]),
			/STILL_ACTIVE|expected to revert/,
			'Second player should not be able to acquire already owned planet',
		);
	});

	it("user can attack other player's planet", async function () {
		const {players, spaceInfo, outerSpaceContract, increaseTime} = fixture;
		const p0 = spaceInfo.findNextPlanet();
		let planet0 = await fetchPlanetState(outerSpaceContract, p0.data);
		let planet1 = await fetchPlanetState(
			outerSpaceContract,
			spaceInfo.findNextPlanet(p0).data,
		);
		
		const amount0 = BigInt(planet0.stats.stake) * 1000000000000000000n;
		const hash0 = await players[0].ConquestToken.write.transferAndCall([
			outerSpaceContract.address,
			amount0,
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}],
				[players[0].address, planet0.location.id],
			),
		]);
		await fixture.env?.publicClient?.waitForTransactionReceipt({hash: hash0});
		
		const amount1 = BigInt(planet1.stats.stake) * 1000000000000000000n;
		const hash1 = await players[1].ConquestToken.write.transferAndCall([
			outerSpaceContract.address,
			amount1,
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}],
				[players[1].address, planet1.location.id],
			),
		]);
		await fixture.env?.publicClient?.waitForTransactionReceipt({hash: hash1});
		
		planet0 = await fetchPlanetState(outerSpaceContract, planet0);
		planet1 = await fetchPlanetState(outerSpaceContract, planet1);

		const block = await fixture.env?.publicClient?.getBlock({blockTag: 'latest'});
		const quantity = planet1.getNumSpaceships(block!.timestamp);
		console.log({quantity, blockTime: block!.timestamp});
		
		const sent = await sendInSecret(spaceInfo, players[1], {
			from: planet1,
			quantity,
			to: planet0,
			gift: false,
		});
		
		if (!sent) {
			throw new Error('no fleet found');
		}
		
		const {
			fleetId,
			secret,
			from,
			to,
			distance,
			timeRequired,
			gift,
		} = sent;
		
		await increaseTime(timeRequired);

		const allianceAddress = gift
			? '0x0000000000000000000000000000000000000001'
			: '0x0000000000000000000000000000000000000000';

		const hash = await players[1].OuterSpace.write.resolveFleet([
			from,
			to,
			BigInt(distance),
			allianceAddress,
			secret,
		]);
		const receipt = await fixture.env?.publicClient?.waitForTransactionReceipt({hash});
		
		assert.ok(receipt, 'Fleet resolution should succeed');
	});

	it('planet production matches estimates', async function () {
		const {players, spaceInfo, outerSpaceContract, increaseTime} = fixture;
		let planet = await fetchPlanetState(
			outerSpaceContract,
			spaceInfo.findNextPlanet().data,
		);
		
		const amount = BigInt(planet.stats.stake) * 1000000000000000000n;
		const hash = await players[0].ConquestToken.write.transferAndCall([
			outerSpaceContract.address,
			amount,
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}],
				[players[0].address, planet.location.id],
			),
		]);
		await fixture.env?.publicClient?.waitForTransactionReceipt({hash});
		
		planet = await fetchPlanetState(outerSpaceContract, planet);
		
		const block = await fixture.env?.publicClient?.getBlock({blockTag: 'latest'});
		const firstTime = block!.timestamp;
		console.log({firstTime});
		
		await sendInSecret(spaceInfo, players[0], {
			from: planet,
			quantity: planet.getNumSpaceships(firstTime),
			to: planet,
			gift: false,
		});
		
		await increaseTime(1000);
		
		const block2 = await fixture.env?.publicClient?.getBlock({blockTag: 'latest'});
		const currentTime = block2!.timestamp;
		
		const new_planet = await fetchPlanetState(outerSpaceContract, planet);
		const quantity = new_planet.getNumSpaceships(currentTime);
		console.log({quantity, currentTime});
		
		await sendInSecret(spaceInfo, players[0], {
			from: planet,
			quantity,
			to: planet,
			gift: false,
		});
		
		const block3 = await fixture.env?.publicClient?.getBlock({blockTag: 'latest'});
		const currentTimeAgain = block3!.timestamp;
		
		const new_planet_again = await fetchPlanetState(outerSpaceContract, planet);
		const quantityAgain = new_planet_again.getNumSpaceships(currentTimeAgain);
		console.log({quantityAgain, currentTimeAgain});
		
		// Try to send more ships than available - should fail
		await assert.rejects(
			sendInSecret(spaceInfo, players[0], {
				from: planet,
				quantity: quantityAgain + 2,
				to: planet,
				gift: false,
			}),
			/expected to revert/,
			'Should not be able to send more ships than available',
		);
	});
});