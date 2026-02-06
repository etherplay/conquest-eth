import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {getTestContext, setupTestEnvironment, teardownTestEnvironment} from './setup.js';

describe('CLI - Contract Tools', () => {
	beforeAll(async () => {
		await setupTestEnvironment();
	}, 30000);

	afterAll(async () => {
		await teardownTestEnvironment();
	});

	describe('call_contract', () => {
		it('Should call a contract', async () => {
			const {env} = getTestContext();
		});
	});
});
