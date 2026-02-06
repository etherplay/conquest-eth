import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import pkg from '../package.json' with {type: 'json'};
import {ConquestEnv} from './types.js';
import * as tools from './tools/index.js';
import {createEthereumEnv, createEthereumMPCServer} from 'tools-ethereum';
import {ServerOptions} from '@modelcontextprotocol/sdk/server';
import {Implementation} from '@modelcontextprotocol/sdk/types.js';
import {getChain} from 'tools-ethereum/helpers';
import {registerAllMCPTools} from './tool-handling/mcp.js';

/**
 * Create and configure an MCP server for Conquest.eth game interactions
 *
 */
export async function createServer(
	env: ConquestEnv,
	options?: {
		ethereum?: boolean;
		serverInfo?: Implementation;
		serverOptions?: ServerOptions;
	},
) {
	let server: McpServer;
	const name = `mcp-conquest-eth-v0`;

	if (options?.ethereum) {
		const ethereumEnv = await createEthereumEnv(env.options);

		server = createEthereumMPCServer(ethereumEnv, {
			serverInfo: {name, version: pkg.version, ...options?.serverInfo},
			serverOptions: options?.serverOptions,
		});
	} else {
		server = new McpServer(
			options?.serverInfo || {
				name,
				version: pkg.version,
			},
			options?.serverOptions || {capabilities: {logging: {}}},
		);
	}

	registerAllMCPTools({server, tools, env});

	return server;
}
