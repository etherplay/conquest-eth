// Test for JS <-> Solidity equivalence of planet stats
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {objMap} from '../test-utils.js';
import {convertPlanetCallData} from './utils.js';
import {outerSpaceFixture} from '../fixtures/outerspaceAndPlayerWithTokens.js';

describe('JS <-> Solidity equivalence', function () {
	let fixture: Awaited<ReturnType<typeof outerSpaceFixture>>;

	before(async () => {
		fixture = await outerSpaceFixture();
	});

	it('planet stats computed from js equal stats from the contract', async function () {
		const {players, spaceInfo} = fixture;
		const pointer = spaceInfo.findNextPlanet();
		const {location, stats} = pointer.data;
		const planet = await players[0].OuterSpace.read.getPlanet([location.id]);
		
		// Remove 'name' from stats as it's only in JS
		// @ts-expect-error - removing property
		delete stats.name;
		
		const statsFromContract = objMap((planet as any).stats, convertPlanetCallData);
		
		console.log({stats});
		console.log({statsFromContract});
		
		// Compare stats
		for (const key of Object.keys(stats)) {
			assert.strictEqual(
				String(statsFromContract[key]),
				String(stats[key]),
				`Stat ${key} should match between JS and contract`,
			);
		}
	});
});