// Test for JS <-> Solidity equivalence of planet stats
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {objMap} from '../test-utils.js';
import {convertPlanetCallData} from './utils.js';
import {network} from 'hardhat';
import {setupOuterSpaceFixtures} from '../fixtures/setupFixtures.js';
import {fetchPlanetState} from './utils.js';

describe('JS <-> Solidity equivalence', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const {provider, networkHelpers: nh} = await network.connect();
		networkHelpers = nh;
		const fixtures = setupOuterSpaceFixtures(provider);
		deployAll = fixtures.deployAll;
	});

	it('planet stats computed from js equal stats from the contract', async function () {
		const {env, OuterSpace, spaceInfo} =
			await networkHelpers.loadFixture(deployAll);

		const pointer = spaceInfo.findNextPlanet();
		const {location, stats} = pointer.data;

		const planet = await fetchPlanetState(env, OuterSpace, pointer.data);

		// Remove 'name' from stats as it's only in JS
		delete (stats as any).name;

		const statsFromContract = objMap(planet.state, convertPlanetCallData);

		console.log({stats});
		console.log({statsFromContract});

		// Compare stats
		for (const key of Object.keys(stats)) {
			assert.strictEqual(
				String(statsFromContract[key]),
				String((stats as any)[key]),
				`Stat ${key} should match between JS and contract`,
			);
		}
	});
});
