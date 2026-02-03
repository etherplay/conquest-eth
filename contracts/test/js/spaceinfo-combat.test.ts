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

	it('Combat matches SpaceInfo: attack fails (defender wins)', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		const attack = 5000;
		const defense = 6000;
		const numAttack = 50000n;
		const numDefense = 100000n;

		const [attackerLoss, defenderLoss] = await env.read(Combat, {
			functionName: 'computeFight',
			args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
		});

		const spaceInfoResult = spaceInfo.combat(
			attack,
			numAttack,
			defense,
			numDefense,
		);

		assert.strictEqual(
			BigInt(attackerLoss),
			spaceInfoResult.attackerLoss,
			'Attacker loss should match',
		);
		assert.strictEqual(
			BigInt(defenderLoss),
			spaceInfoResult.defenderLoss,
			'Defender loss should match',
		);
		assert.ok(BigInt(attackerLoss) === numAttack, 'Attacker should lose all');
	});

	it('Combat matches SpaceInfo: attack succeeds (attacker wins)', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		const attack = 6000;
		const defense = 4000;
		const numAttack = 150000n;
		const numDefense = 50000n;

		const [attackerLoss, defenderLoss] = await env.read(Combat, {
			functionName: 'computeFight',
			args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
		});

		const spaceInfoResult = spaceInfo.combat(
			attack,
			numAttack,
			defense,
			numDefense,
		);

		assert.strictEqual(
			BigInt(attackerLoss),
			spaceInfoResult.attackerLoss,
			'Attacker loss should match',
		);
		assert.strictEqual(
			BigInt(defenderLoss),
			spaceInfoResult.defenderLoss,
			'Defender loss should match',
		);
		assert.ok(BigInt(defenderLoss) === numDefense, 'Defender should lose all');
	});

	it('Combat matches SpaceInfo: zero attack', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		const attack = 5000;
		const defense = 5000;
		const numAttack = 0n;
		const numDefense = 50000n;

		const [attackerLoss, defenderLoss] = await env.read(Combat, {
			functionName: 'computeFight',
			args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
		});

		const spaceInfoResult = spaceInfo.combat(
			attack,
			numAttack,
			defense,
			numDefense,
		);

		assert.strictEqual(
			BigInt(attackerLoss),
			spaceInfoResult.attackerLoss,
			'Attacker loss should match',
		);
		assert.strictEqual(
			BigInt(defenderLoss),
			spaceInfoResult.defenderLoss,
			'Defender loss should match',
		);
	});

	it('Combat matches SpaceInfo: zero defense', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		const attack = 5000;
		const defense = 5000;
		const numAttack = 50000n;
		const numDefense = 0n;

		const [attackerLoss, defenderLoss] = await env.read(Combat, {
			functionName: 'computeFight',
			args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
		});

		const spaceInfoResult = spaceInfo.combat(
			attack,
			numAttack,
			defense,
			numDefense,
		);

		assert.strictEqual(
			BigInt(attackerLoss),
			spaceInfoResult.attackerLoss,
			'Attacker loss should match',
		);
		assert.strictEqual(
			BigInt(defenderLoss),
			spaceInfoResult.defenderLoss,
			'Defender loss should match',
		);
	});

	it('Combat matches SpaceInfo: edge case with equal stats', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		const attack = 5000;
		const defense = 5000;
		const numAttack = 100000n;
		const numDefense = 100000n;

		const [attackerLoss, defenderLoss] = await env.read(Combat, {
			functionName: 'computeFight',
			args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
		});

		const spaceInfoResult = spaceInfo.combat(
			attack,
			numAttack,
			defense,
			numDefense,
		);

		assert.strictEqual(
			BigInt(attackerLoss),
			spaceInfoResult.attackerLoss,
			'Attacker loss should match',
		);
		assert.strictEqual(
			BigInt(defenderLoss),
			spaceInfoResult.defenderLoss,
			'Defender loss should match',
		);
	});

	it('Combat matches SpaceInfo: large fleet scenario', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		const attack = 6000;
		const defense = 4000;
		const numAttack = 1000000n;
		const numDefense = 500000n;

		const [attackerLoss, defenderLoss] = await env.read(Combat, {
			functionName: 'computeFight',
			args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
		});

		const spaceInfoResult = spaceInfo.combat(
			attack,
			numAttack,
			defense,
			numDefense,
		);

		assert.strictEqual(
			BigInt(attackerLoss),
			spaceInfoResult.attackerLoss,
			'Attacker loss should match',
		);
		assert.strictEqual(
			BigInt(defenderLoss),
			spaceInfoResult.defenderLoss,
			'Defender loss should match',
		);
	});

	it('Combat matches SpaceInfo: multiple random scenarios', async function () {
		const {Combat, spaceInfo, env} =
			await networkHelpers.loadFixture(deployAllAndCombat);

		// Test multiple random scenarios
		for (let i = 0; i < 20; i++) {
			const attack = 4000 + Math.floor(Math.random() * 6000); // 4000-10000
			const defense = 4000 + Math.floor(Math.random() * 6000); // 4000-10000
			const numAttack = BigInt(Math.floor(Math.random() * 500000) + 10000);
			const numDefense = BigInt(Math.floor(Math.random() * 500000) + 10000);

			const [attackerLoss, defenderLoss] = await env.read(Combat, {
				functionName: 'computeFight',
				args: [numAttack, numDefense, BigInt(attack), BigInt(defense)],
			});

			const spaceInfoResult = spaceInfo.combat(
				attack,
				numAttack,
				defense,
				numDefense,
			);

			assert.strictEqual(
				BigInt(attackerLoss),
				spaceInfoResult.attackerLoss,
				`Attacker loss should match in iteration ${i}`,
			);
			assert.strictEqual(
				BigInt(defenderLoss),
				spaceInfoResult.defenderLoss,
				`Defender loss should match in iteration ${i}`,
			);
		}
	});
});
