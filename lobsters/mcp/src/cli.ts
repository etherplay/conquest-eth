#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createServer} from './index.js';
import {Command} from 'commander';
import pkg from '../package.json' with {type: 'json'};
import {getChain} from 'mcp-ethereum/helpers';
import {loadEnv} from 'ldenv';

loadEnv();

const program = new Command();

program
	.name(pkg.name)
	.description(pkg.description)
	.version(pkg.version)
	.option('--rpc-url <url>', 'RPC URL for the Ethereum network', '')
	.option('--ethereum', 'Whether to also provide mcp-ethereum tools', '')
	.option('--game-contract <address>', 'Contract address of the game', '')
	.option('--storage <type>', 'Storage backend: json or sqlite', 'json')
	.option('--storage-path <path>', 'Path to storage directory', './data')
	.parse(process.argv);

const options: {
	rpcUrl?: string;
	ethereum?: boolean;
	gameContract?: `0x${string}`;
	storage?: string;
	storagePath?: string;
} = program.opts();

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
	console.warn('Warning: PRIVATE_KEY environment variable is required for sending transactions');
} else if (!privateKey.startsWith('0x')) {
	console.error('Error: PRIVATE_KEY must start with 0x');
	process.exit(1);
}

let rpcUrl = options.rpcUrl;
if (!rpcUrl) {
	rpcUrl = process.env.RPC_URL;
	if (!rpcUrl) {
		console.error(
			'Error: --rpc-url option is required, alternatively set RPC_URL environment variable',
		);
		process.exit(1);
	}
}

if (!options.gameContract) {
	console.error('Error: --game-contract option is required');
	process.exit(1);
}

const transport = new StdioServerTransport();

const chain = await getChain(rpcUrl);
const server = createServer(
	{
		chain,
		privateKey: privateKey as `0x${string}`,
		gameContract: options.gameContract,
	},
	{
		ethereum: options.ethereum,
		storageConfig: {
			type: (options.storage as 'json' | 'sqlite') || 'json',
			dataDir: options.storagePath,
		},
	},
);
await server.connect(transport);
