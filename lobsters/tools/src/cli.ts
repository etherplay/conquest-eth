#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createServer} from './index.js';
import {Command} from 'commander';
import pkg from '../package.json' with {type: 'json'};
import {getChain} from 'tools-ethereum/helpers';
import {loadEnv} from 'ldenv';
import * as tools from './tools/index.js';
import {registerAllToolCommands} from './tool-handling/cli-tool-generator.js';

loadEnv();

const program = new Command();

// Get the binary name from package.json
const binName = Object.keys(pkg.bin || {})[0];

program
	.name(binName)
	.description(pkg.description || 'Conquest.eth CLI - MCP server and direct tool execution')
	.version(pkg.version)
	// Global options available to all commands
	.option('--rpc-url <url>', 'RPC URL for the Ethereum network', process.env.RPC_URL || '')
	.option(
		'--game-contract <address>',
		'Contract address of the game',
		process.env.GAME_CONTRACT || '',
	)
	.option('--storage <type>', 'Storage backend: json or sqlite', process.env.STORAGE_TYPE || 'json')
	.option(
		'--storage-path <path>',
		'Path to storage directory',
		process.env.STORAGE_PATH || './data',
	)
	.option(
		'--private-key <key>',
		'Private key for sending transactions',
		process.env.PRIVATE_KEY || '',
	)
	.action(() => {
		program.help();
	});

// MCP subcommand - starts the MCP server
program
	.command('mcp')
	.description('Start the MCP server')
	.option(
		'--ethereum',
		'Whether to also provide tools-ethereum tools',
		process.env.ETHEREUM_TOOLS === 'true',
	)
	.action(async () => {
		const options = program.opts();
		const mcpOptions = program.commands.find((cmd) => cmd.name() === 'mcp')?.opts() || {};

		const rpcUrl = options.rpcUrl;
		const gameContract = options.gameContract;
		const ethereum = mcpOptions.ethereum ?? process.env.ETHEREUM_TOOLS === 'true';
		const privateKey = options.privateKey;
		const storage = options.storage;
		const storagePath = options.storagePath;

		// Validate required options
		if (!rpcUrl) {
			console.error('Error: --rpc-url option or RPC_URL environment variable is required');
			process.exit(1);
		}

		if (!gameContract) {
			console.error(
				'Error: --game-contract option or GAME_CONTRACT environment variable is required',
			);
			process.exit(1);
		}

		// Warn if private key is not provided for write operations
		if (!privateKey) {
			console.warn(
				'Warning: PRIVATE_KEY environment variable is required for sending transactions',
			);
		} else if (!privateKey.startsWith('0x')) {
			console.error('Error: PRIVATE_KEY must start with 0x');
			process.exit(1);
		}

		const chain = await getChain(rpcUrl);
		const transport = new StdioServerTransport();
		const server = createServer(
			{
				chain,
				privateKey: privateKey as `0x${string}`,
				gameContract: gameContract as `0x${string}`,
			},
			{
				ethereum,
				storageConfig: {
					type: storage as 'json' | 'sqlite',
					dataDir: storagePath,
				},
			},
		);
		await server.connect(transport);
	});

// Register all tool commands dynamically
registerAllToolCommands(program, tools);

program.parse(process.argv);
