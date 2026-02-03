import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {setupFixtures} from '../fixtures/index.js';
import {artifacts} from '../../rocketh/deploy.js';
import assert from 'node:assert';
import {Deployment} from 'rocketh/types';
import {Abi_Combat} from '../../generated/abis/Combat.js';

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

async function deployAllAndCombat(): Promise<
	Awaited<ReturnType<typeof deployAll>> & {Combat: Deployment<Abi_Combat>}
> {
	const data = await networkHelpers.loadFixture(deployAll);
	const outerSpaceLinkedData = data.OuterSpace.linkedData;
	const Combat = await data.env.deploy('Combat', {
		artifact: artifacts.Combat,
		account: data.namedAccounts.deployer,
		args: [outerSpaceLinkedData as any],
	});
	return {...data, Combat};
}

describe('Combat: testing complex combat mechanics with real Solidity', function () {
	it('Combat is deployed', async function () {
		const {Combat, spaceInfo} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		assert.ok(Combat.address);
	});
});
