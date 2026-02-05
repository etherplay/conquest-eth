import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../package.json' with {type: 'json'};
import {Implementation} from '@modelcontextprotocol/sdk/types.js';
import {Chain} from 'viem';
import {ServerOptions} from '@modelcontextprotocol/sdk/server';
import {createServer as createMCPEthereumServer} from 'tools-ethereum';
import {getClients} from 'tools-ethereum/helpers';
import {createSpaceInfo} from './contracts/space-info.js';
import {JsonFleetStorage} from './storage/json-storage.js';
import {FleetManager} from './fleet/manager.js';
import {PlanetManager} from './planet/manager.js';
import type {ClientsWithOptionalWallet, ContractConfig, GameContract} from './types.js';
import {SpaceInfo} from 'conquest-eth-v0-contracts';

// Import refactored tools
import * as tools from './tools/index.js';
import {registerTool, stringifyWithBigInt} from './helpers/index.js';
import {Abi_IOuterSpace} from 'conquest-eth-v0-contracts/abis/IOuterSpace.js';

/**
 * Create and configure an MCP server for Conquest.eth game interactions
 *
 * @param params - Configuration parameters for the server
 * @param params.chain - The blockchain chain to connect to
 * @param params.privateKey - Optional private key for signing transactions (wallet operations)
 * @param params.gameContract - The game contract address
 * @param options - Optional server configuration
 * @param options.ethereum - Whether to include Ethereum MCP tools (default: false)
 * @param options.rpcURL - Optional custom RPC URL
 * @param options.serverOptions - Optional MCP server options
 * @param options.serverInfo - Optional server metadata to override defaults
 * @param options.storageConfig - Storage configuration for fleets and exits
 * @param options.storageConfig.type - Storage type ('json' or 'sqlite')
 * @param options.storageConfig.dataDir - Optional data directory path
 * @returns Configured MCP server instance with Conquest game tools registered
 */
export function createServer(
	params: {chain: Chain; privateKey?: `0x${string}`; gameContract: `0x${string}`},
	options?: {
		ethereum?: boolean;
		rpcURL?: string;
		serverOptions?: ServerOptions;
		serverInfo?: Implementation;
		storageConfig?: {type: 'json' | 'sqlite'; dataDir?: string};
	},
) {
	const {gameContract: gameContractAddress, ...mcpEthereumParams} = params;
	const clients = getClients(params, options) as ClientsWithOptionalWallet;

	const gameContract: GameContract = {
		address: gameContractAddress,
		abi: Abi_IOuterSpace,
	};

	const name = `mcp-conquest-eth-v0`;
	const server = options?.ethereum
		? createMCPEthereumServer(mcpEthereumParams, {
				...options,
				serverInfo: {name, version: pkg.version, ...options?.serverInfo},
			})
		: new McpServer(
				options?.serverInfo || {
					name,
					version: pkg.version,
				},
				options?.serverOptions || {capabilities: {logging: {}}},
			);

	// Initialize SpaceInfo and contractConfig
	let spaceInfo: SpaceInfo | null = null;
	let contractConfig: ContractConfig | null = null;

	const initSpaceInfo = async () => {
		if (!spaceInfo || !contractConfig) {
			const result = await createSpaceInfo(clients, gameContract);
			spaceInfo = result.spaceInfo;
			contractConfig = result.contractConfig;
		}
		return {spaceInfo, contractConfig};
	};

	// Initialize storage
	const storageConfig = options?.storageConfig || {type: 'json', dataDir: './data'};
	const storage = new JsonFleetStorage(storageConfig.dataDir || './data');

	// Initialize managers (will be initialized after spaceInfo is ready)
	let fleetManager: FleetManager | null = null;
	let planetManager: PlanetManager | null = null;

	// Helper to ensure managers are initialized
	const ensureManagersInitialized = async () => {
		const {spaceInfo: si, contractConfig: cc} = await initSpaceInfo();

		// Initialize fleetManager even without walletClient for read-only operations
		if (!fleetManager && si && cc) {
			fleetManager = new FleetManager(clients, gameContract, si, cc, storage);
		}

		// Initialize planetManager even without walletClient for read-only operations
		if (!planetManager && si && cc) {
			planetManager = new PlanetManager(clients, gameContract, si, cc, storage);
		}

		if (!fleetManager) {
			throw new Error('Fleet manager not initialized');
		}
		if (!planetManager) {
			throw new Error('Planet manager not initialized');
		}

		return {fleetManager, planetManager};
	};

	// Auto-register all tools
	for (const [name, tool] of Object.entries(tools)) {
		// Skip the file that's not a tool
		if (name === 'default') continue;

		server.registerTool(
			name,
			{
				description: tool.description,
				inputSchema: tool.schema,
			},
			async (args: unknown) => {
				try {
					const {fleetManager, planetManager} = await ensureManagersInitialized();

					const env = {
						sendStatus: async (_message: string) => {
							// TODO: Implement progress notifications when sessionId is available
						},
						fleetManager,
						planetManager,
					};

					const result = await tool.execute(env, args as any);

					// Convert ToolResult to CallToolResult
					if (result.success === false) {
						return {
							content: [
								{
									type: 'text' as const,
									text: stringifyWithBigInt({
										error: result.error,
										...(result.stack ? {stack: result.stack} : {}),
									}),
								},
							],
							isError: true,
						};
					}

					return {
						content: [
							{
								type: 'text' as const,
								text: stringifyWithBigInt(result.result, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: 'text' as const,
								text: stringifyWithBigInt({
									error: error instanceof Error ? error.message : String(error),
								}),
							},
						],
						isError: true,
					};
				}
			},
		);
	}

	return server;
}
