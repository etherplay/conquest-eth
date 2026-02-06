import {getChain} from '../src/helpers/index.js';
import {Chain, createPublicClient, createWalletClient, http} from 'viem';
import {RPC_URL} from './prool/url.js';
import DeployPlayToken from 'conquest-eth-v0-contracts/deploy/01_play_tokens/01_deploy_play_token.js';
// import {} from 'rocketh';
import {setupEnvironmentFromFiles} from '@rocketh/node';
import {createProxiedJSONRPC} from 'remote-procedure-call';
import {Methods} from 'eip-1193';

// Test context type
export type TestContext = {
	chain: Chain;
	rpcUrl: string;
	walletClient: ReturnType<typeof createWalletClient>;
	publicClient: ReturnType<typeof createPublicClient>;
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
	const provider = createProxiedJSONRPC<Methods>(rpcUrl);

	const {loadAndExecuteDeploymentsFromFiles} = setupEnvironmentFromFiles({});

	await loadAndExecuteDeploymentsFromFiles({
		provider: provider as any,
		config: {
			scripts: 'node_modules/conquest-eth-v0-contracts/deploy',
		},
		environment: 'memory',
		saveDeployments: false,
		askBeforeProceeding: false,
	});

	// Create chain with local RPC
	const chain = await getChain(rpcUrl);

	const walletClient = createWalletClient({chain, transport: http(rpcUrl)});
	const publicClient = createPublicClient({chain, transport: http(rpcUrl)});

	testContext = {
		chain,
		rpcUrl,
		walletClient,
		publicClient,
	};

	return testContext;
}

/**
 * Tear down test environment - stops Anvil and closes client connection
 */
export async function teardownTestEnvironment(): Promise<void> {
	testContext = null;
}
