import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../package.json' with {type: 'json'};
import {Implementation} from '@modelcontextprotocol/sdk/types.js';
import {Chain} from 'viem';
import {ServerOptions} from '@modelcontextprotocol/sdk/server';
import {createServer as createMCPEthereumServer} from 'tools-ethereum';
import {getClients, getChain} from 'tools-ethereum/helpers';
import {createSpaceInfo} from './contracts/space-info.js';
import {JsonFleetStorage} from './storage/json-storage.js';
import {FleetManager} from './fleet/manager.js';
import {PlanetManager} from './planet/manager.js';
import type {ClientsWithOptionalWallet, ConquestEnv, GameContract} from './types.js';

// Import refactored tools
import * as tools from './tools/index.js';
import {stringifyWithBigInt} from './tool-handling/index.js';
import {Abi_IOuterSpace} from 'conquest-eth-v0-contracts/abis/IOuterSpace.js';

/**
 * Configuration options for creating the ConquestEnv
 */
export interface EnvFactoryOptions {
	/** RPC URL for the Ethereum network */
	rpcUrl: string;
	/** Contract address of the game */
	gameContract: `0x${string}`;
	/** Optional private key for sending transactions */
	privateKey?: `0x${string}`;
	/** Path to storage directory (default: './data') */
	storagePath?: string;
}

/**
 * Factory function to create the ConquestEnv
 * This is shared between CLI and MCP server
 *
 * @param options - Configuration options for creating the environment
 * @returns ConquestEnv with fleetManager and planetManager
 */
export async function createConquestEnv(options: EnvFactoryOptions): Promise<ConquestEnv> {
	const {rpcUrl, gameContract: gameContractAddress, privateKey, storagePath = './data'} = options;

	const chain = await getChain(rpcUrl);
	const clients = getClients({
		chain,
		privateKey,
	}) as ClientsWithOptionalWallet;

	const gameContract: GameContract = {
		address: gameContractAddress,
		abi: Abi_IOuterSpace,
	};

	const {spaceInfo, contractConfig} = await createSpaceInfo(clients, gameContract);
	const storage = new JsonFleetStorage(storagePath);

	return {
		fleetManager: new FleetManager(clients, gameContract, spaceInfo, contractConfig, storage),
		planetManager: new PlanetManager(clients, gameContract, spaceInfo, contractConfig, storage),
	};
}

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

	// Lazy initialization of ConquestEnv using the shared factory
	let conquestEnv: ConquestEnv | null = null;

	// Helper to ensure environment is initialized
	const ensureEnvInitialized = async (): Promise<ConquestEnv> => {
		if (!conquestEnv) {
			const rpcUrl = options?.rpcURL || params.chain.rpcUrls.default.http[0];
			conquestEnv = await createConquestEnv({
				rpcUrl,
				gameContract: gameContractAddress,
				privateKey: params.privateKey,
				storagePath: options?.storageConfig?.dataDir || './data',
			});
		}
		return conquestEnv;
	};

	// Auto-register all tools using the generic registerTool
	for (const [name, tool] of Object.entries(tools)) {
		// Skip the file that's not a tool
		if (name === 'default') continue;

		// Use the generic registerTool with lazy initialization
		server.registerTool(
			name,
			{
				description: tool.description,
				inputSchema: tool.schema,
			},
			async (args: unknown) => {
				try {
					const env = await ensureEnvInitialized();

					const toolEnv = {
						sendStatus: async (_message: string) => {
							// TODO: Implement progress notifications when sessionId is available
						},
						...env,
					};

					const result = await tool.execute(toolEnv, args as any);

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
