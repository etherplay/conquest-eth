import {getChain} from 'tools-ethereum/helpers';
import {Chain, createPublicClient, createWalletClient, http} from 'viem';
import {RPC_URL} from './prool/url.js';
import DeployPlayToken from 'conquest-eth-v0-contracts/deploy/01_play_tokens/01_deploy_play_token.js';
// import {} from 'rocketh';
import {setupEnvironmentFromFiles} from '@rocketh/node';
import {createCurriedJSONRPC} from 'remote-procedure-call';
import {Methods} from 'eip-1193';
import type {Environment} from '@rocketh/node';

// Test context type
export type TestContext = {
	chain: Chain;
	rpcUrl: string;
	walletClient: ReturnType<typeof createWalletClient>;
	publicClient: ReturnType<typeof createPublicClient>;
	env: Environment;
};

// Global test setup
let testContext: TestContext | null = null;

/**
 * Setup test environment - starts Anvil, deploys test contract, creates MCP server
 * @returns Test context with server, client, and RPC clients
 */
export async function setupTestEnvironment(): Promise<TestContext> {
	if (testContext) {
		return testContext;
	}

	const rpcUrl = RPC_URL;
	const provider = createCurriedJSONRPC<Methods>(rpcUrl);

	const {loadAndExecuteDeploymentsFromFilesWithConfig} = setupEnvironmentFromFiles({});

	const env = await loadAndExecuteDeploymentsFromFilesWithConfig(
		{
			provider: provider as any,
			config: {
				scripts: 'node_modules/conquest-eth-v0-contracts/deploy',
			},
			environment: 'memory',
			saveDeployments: false,
			askBeforeProceeding: false,
		},
		{
			accounts: {
				deployer: 0,
				claimKeyDistributor: 0,
			},
			environments: {
				memory: {
					chain: 31337,
					overrides: {
						tags: ['auto-mine'],
					},
				},
			},
		},
	);

	// Create chain with local RPC
	const chain = await getChain(rpcUrl);

	const walletClient = createWalletClient({chain, transport: http(rpcUrl)});
	const publicClient = createPublicClient({chain, transport: http(rpcUrl)});

	testContext = {
		chain,
		rpcUrl,
		walletClient,
		publicClient,
		env,
	};

	return testContext;
}

/**
 * Tear down test environment - stops Anvil and closes client connection
 */
export async function teardownTestEnvironment(): Promise<void> {
	testContext = null;
}

/**
 * Get or create test context
 */
export function getTestContext(): TestContext {
	if (!testContext) {
		throw new Error('Test context not initialized. Call setupTestEnvironment() first.');
	}
	return testContext;
}

/**
 * Get the game contract address from deployed environment
 */
export function getGameContract(): string {
	if (!testContext) {
		throw new Error('Test context not initialized. Call setupTestEnvironment() first.');
	}
	const OuterSpace = testContext.env.get('OuterSpace');
	return OuterSpace.address.toLowerCase();
}

// Re-export RPC_URL for convenience
export {RPC_URL};
