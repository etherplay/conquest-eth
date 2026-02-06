#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {Command} from 'commander';
import pkg from '../package.json' with {type: 'json'};
import {loadEnv} from 'ldenv';
import * as tools from './tools/index.js';
import {type EnvFactory, registerAllToolCommands} from './tool-handling/cli-tool-generator.js';
import type {ConquestEnv} from './types.js';
import {createServer} from './mcp.js';
import {createConquestEnv} from './index.js';

loadEnv();

const program = new Command();

// Get the binary name from package.json
const binName = Object.keys(pkg.bin || {})[0];

// ----------------------------------------------------------------------------
// GLOBAL OPTIONS
// ----------------------------------------------------------------------------
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

function gatherGlobalOptions(program: Command) {
	const globalOptions = program.opts();
	const rpcUrl = globalOptions.rpcUrl;
	const gameContract = globalOptions.gameContract;

	const privateKey = globalOptions.privateKey;
	const storage = globalOptions.storage;
	const storagePath = globalOptions.storagePath;

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
		console.warn('Warning: PRIVATE_KEY environment variable is required for sending transactions');
	} else if (!privateKey.startsWith('0x')) {
		console.error('Error: PRIVATE_KEY must start with 0x');
		process.exit(1);
	}

	return {rpcUrl, gameContract, privateKey, storage, storagePath};
}
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// FACTORY THAT GENERATE THE Conquest Environment Used By Tools
// ----------------------------------------------------------------------------
/**
 * Factory function to create the ConquestEnv from CLI options
 */
const envFactory: EnvFactory<ConquestEnv> = async () => {
	const {rpcUrl, gameContract, privateKey, storage, storagePath} = gatherGlobalOptions(program);

	return createConquestEnv({
		rpcUrl,
		gameContract,
		privateKey,
		storagePath,
	});
};
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// MCP subcommand - starts the MCP server
// ----------------------------------------------------------------------------
program
	.command('mcp')
	.description('Start the MCP server')
	.option(
		'--ethereum',
		'Whether to also provide tools-ethereum tools',
		process.env.ETHEREUM_TOOLS === 'true',
	)
	.action(async (options) => {
		const env = await envFactory();

		const ethereum = options.ethereum ?? process.env.ETHEREUM_TOOLS === 'true';

		const transport = new StdioServerTransport();
		const server = await createServer(env, {ethereum});
		await server.connect(transport);
	});
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Register all tool commands dynamically with the CLI config
registerAllToolCommands(program, tools, envFactory);
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// HANDLE unknown command
// ----------------------------------------------------------------------------
const args = process.argv.slice(2);
const registeredCommands = program.commands.map((cmd) => cmd.name());

// Check if the first argument is a known command or a global flag
const isKnown = registeredCommands.includes(args[0]) || args[0]?.startsWith('-');

if (args.length > 0 && !isKnown) {
	console.error(`error: unknown command: ${args[0]}`);
	program.outputHelp();
	process.exit(1);
}
// ----------------------------------------------------------------------------

program.parse(process.argv);
