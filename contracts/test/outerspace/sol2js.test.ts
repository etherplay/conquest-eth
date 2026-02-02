// Test for JS <-> Solidity equivalence of planet stats
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {fetchPlanetState} from './utils.js';
import {setupFixtures} from '../fixtures/index.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('JS <-> Solidity equivalence', function () {
	it('planet stats computed from js equal stats from the contract', async function () {
		const {env, OuterSpace, spaceInfo} =
			await networkHelpers.loadFixture(deployAll);

		const pointer = spaceInfo.findNextPlanet();
		const {location, stats} = pointer.data;

		const planet = await fetchPlanetState(env, OuterSpace, pointer.data);

		// Remove 'name' from stats as it's only in JS
		delete (stats as any).name;

		// Compare stats
		for (const key of Object.keys(planet.stats)) {
			assert.strictEqual(
				String((planet.stats as any)[key]),
				String((stats as any)[key]),
				`Stat ${key} should match between JS and contract`,
			);
		}
	});
});
