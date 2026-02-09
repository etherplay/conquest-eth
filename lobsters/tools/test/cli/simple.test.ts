import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {getTestContext, setupTestEnvironment, teardownTestEnvironment} from '../setup.js';
import {invokeCliCommand} from '../cli-utils.js';
import {RPC_URL} from '../prool/url.js';

describe('CLI - Contract Tools', () => {
	beforeAll(async () => {
		await setupTestEnvironment();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('get_planets_around', () => {
		it('should call the contract to get the planets', async () => {
			const {env} = getTestContext();
			const OuterSpace = env.get('OuterSpace');
			const {stdout, exitCode} = await invokeCliCommand([
				'--rpc-url',
				RPC_URL,
				'--game-contract',
				OuterSpace.address.toLowerCase(),
				'get_planets_around',
				'--center',
				'0,0',
				'--radius',
				'10',
			]);

			console.log(stdout);

			expect(exitCode).toBe(0);
			const result = JSON.parse(stdout);
			expect(result.planets).toBeDefined();
		});
	});
});
