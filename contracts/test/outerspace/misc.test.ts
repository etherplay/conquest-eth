// Test for Solidity to JavaScript conversion utilities
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {objMap} from '../test-utils.js';
import {convertPlanetCallData} from './utils.js';
import type {TestConversion} from '../../generated/artifacts/TestConversion.js';
import {network} from 'hardhat';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';

describe('conversion solidity', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const { provider, networkHelpers: nh } = await network.connect();
		networkHelpers = nh;
		deployAll = async () => {
			const env = await loadAndExecuteDeploymentsFromFiles({provider});
			const TestConversion = env.get<TestConversion>('TestConversion');
			return { env, TestConversion };
		};
	});

	const testCases = [
		'0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
		'0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF00000000000000000000000000000000',
		'0x00000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
		'0x0000000000000000000000000000000000000000000000000000000000000000',
		'0x0000000000000000000000000000000000000000000000000000000000000001',
		'0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE',
		'0x0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE',
		'0x00FFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE',
		'0x000FFFFFFFFFFFFFFFFFFFFFFFFFFFFE0FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFE',
	];

	for (const testCase of testCases) {
		it(`conversion for ${testCase}`, async function () {
			const { env, TestConversion } = await networkHelpers.loadFixture(deployAll);
			const hash = await env.execute(TestConversion, {
				functionName: 'testConversion',
				args: [testCase as `0x${string}`],
				account: env.namedAccounts.deployer,
			});
			const receipt = await env.viem.publicClient.waitForTransactionReceipt({hash});
			
			assert.ok(receipt, 'Transaction receipt should exist');
			console.log('-----------------------------------------');
		});
	}
});