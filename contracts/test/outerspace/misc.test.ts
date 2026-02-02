// Test for Solidity to JavaScript conversion utilities
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {objMap} from '../test-utils.js';
import {convertPlanetCallData} from './utils.js';
import type {TestConversion} from '../../generated/artifacts/TestConversion.js';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {setupUsers, type User} from '../utils/index.js';

type Contracts = {
	TestConversion: TestConversion;
};

type TestConversionFixture = {
	env: Awaited<ReturnType<typeof loadAndExecuteDeploymentsFromFiles>>;
	players: User<Contracts>[];
};

/**
 * Fixture for TestConversion tests
 */
async function testConversionFixture(): Promise<TestConversionFixture> {
	const env = await loadAndExecuteDeploymentsFromFiles();
	const accounts = await env.accounts();
	const unNamedAccounts = accounts.unnamedAccounts;

	// Deploy TestConversion contract
	const TestConversion = await env.get<TestConversion>('TestConversion');

	const players = await setupUsers(
		unNamedAccounts,
		{TestConversion},
		async (address) => env.getWalletClient(address),
	);

	return {env, players};
}

describe('conversion solidity', function () {
	let fixture: TestConversionFixture;

	before(async () => {
		fixture = await testConversionFixture();
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
			const {TestConversion} = fixture;
			const hash = await TestConversion.write.testConversion([testCase as `0x${string}`]);
			const receipt = await fixture.env.publicClient.waitForTransactionReceipt({hash});
			
			assert.ok(receipt, 'Transaction receipt should exist');
			console.log('-----------------------------------------');
		});
	}
});