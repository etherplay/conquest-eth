import {Command} from 'commander';
import {z} from 'zod';
import type {Tool, ToolEnvironment} from './tool-handling/types.js';
import {getClients} from 'tools-ethereum/helpers';
import {getChain} from 'tools-ethereum/helpers';
import {createSpaceInfo} from './contracts/space-info.js';
import {JsonFleetStorage} from './storage/json-storage.js';
import {FleetManager} from './fleet/manager.js';
import {PlanetManager} from './planet/manager.js';
import type {ClientsWithOptionalWallet, GameContract, StorageConfig} from './types.js';
import {SpaceInfo} from 'conquest-eth-v0-contracts';
import {Abi_IOuterSpace} from 'conquest-eth-v0-contracts/abis/IOuterSpace.js';

/**
 * CLI configuration parameters
 */
export interface CliConfig {
	chain: any;
	privateKey?: `0x${string}`;
	gameContract: `0x${string}`;
	ethereum?: boolean;
	storageConfig: StorageConfig;
}

/**
 * Convert Zod schema field to commander.js option definition
 */
function zodFieldToOption(name: string, field: z.ZodTypeAny): string {
	if (field instanceof z.ZodBoolean) {
		return `--${name}`;
	}
	return `--${name} <value>`;
}

/**
 * Parse option value based on Zod type
 */
function parseOptionValue(field: z.ZodTypeAny, value: any): any {
	if (field instanceof z.ZodArray) {
		return typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value;
	}
	if (field instanceof z.ZodNumber) {
		return Number(value);
	}
	if (field instanceof z.ZodBoolean) {
		return value === true || value === 'true';
	}
	return value;
}

/**
 * Extract description from Zod schema field
 */
function getFieldDescription(field: z.ZodTypeAny): string {
	return (field as any).description || 'No description available';
}

/**
 * Check if a Zod field is optional
 */
function isOptionalField(field: z.ZodTypeAny): boolean {
	return field instanceof z.ZodOptional || field.isOptional?.();
}

/**
 * Create a CLI tool environment for executing tools
 */
async function createCliToolEnvironment(config: CliConfig): Promise<ToolEnvironment> {
	const {gameContract: gameContractAddress, chain, storageConfig} = config;

	// Get clients
	const clients = getClients({chain, privateKey: config.privateKey}) as ClientsWithOptionalWallet;

	// Initialize game contract
	const gameContract: GameContract = {
		address: gameContractAddress,
		abi: Abi_IOuterSpace,
	};

	// Initialize SpaceInfo
	const {spaceInfo, contractConfig} = await createSpaceInfo(clients, gameContract);

	// Initialize storage
	const storage = new JsonFleetStorage(storageConfig.dataDir || './data');

	// Initialize managers
	const fleetManager = new FleetManager(clients, gameContract, spaceInfo, contractConfig, storage);
	const planetManager = new PlanetManager(
		clients,
		gameContract,
		spaceInfo,
		contractConfig,
		storage,
	);

	return {
		fleetManager,
		planetManager,
		sendStatus: async (message: string) => {
			console.log(`[Status] ${message}`);
		},
	};
}

/**
 * Parse and validate parameters against Zod schema
 */
async function parseAndValidateParams(
	schema: z.ZodObject<any>,
	options: Record<string, any>,
): Promise<any> {
	try {
		return await schema.parseAsync(options);
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.error('Parameter validation error:');
			for (const err of error.issues) {
				console.error(`  - ${err.path.join('.')}: ${err.message}`);
			}
		}
		throw error;
	}
}

/**
 * Format tool result for CLI output
 */
function formatToolResult(result: {
	success: boolean;
	result?: any;
	error?: string;
	stack?: string;
}): void {
	if (result.success) {
		console.log(JSON.stringify(result.result, null, 2));
	} else {
		console.error(
			JSON.stringify(
				{error: result.error, ...(result.stack ? {stack: result.stack} : {})},
				null,
				2,
			),
		);
		process.exit(1);
	}
}

/**
 * Generate a single tool command from tool definition
 */
export function generateToolCommand(
	program: Command,
	toolName: string,
	tool: Tool<z.ZodObject<any>>,
): void {
	const shape = tool.schema.shape;
	const cmd = program.command(toolName).description(tool.description);

	// Add options for each schema field
	for (const [fieldName, field] of Object.entries(shape)) {
		const actualField = isOptionalField(field as z.ZodTypeAny)
			? (field as z.ZodOptional<any>).unwrap()
			: field;

		// Handle nested objects by flattening them
		if (actualField instanceof z.ZodObject) {
			const nestedShape = actualField.shape;
			for (const [nestedKey, nestedField] of Object.entries(nestedShape)) {
				const optionName = `${fieldName}-${nestedKey}`;
				const optionDef = zodFieldToOption(optionName, nestedField);
				const description = getFieldDescription(nestedField);
				cmd.option(optionDef, description);
			}
		} else {
			const optionDef = zodFieldToOption(fieldName, actualField);
			const description = getFieldDescription(actualField);

			if (isOptionalField(field as z.ZodTypeAny)) {
				cmd.option(optionDef, description);
			} else {
				cmd.requiredOption(optionDef, description);
			}
		}
	}

	cmd.action(async (options: Record<string, any>) => {
		try {
			const globalOptions = program.opts();

			// Get global options
			const rpcUrl = options.rpcUrl || globalOptions.rpcUrl || process.env.RPC_URL;
			const gameContract =
				options.gameContract || globalOptions.gameContract || process.env.GAME_CONTRACT;
			const ethereum =
				options.ethereum ?? globalOptions.ethereum ?? process.env.ETHEREUM_TOOLS === 'true';
			const privateKey = options.privateKey || globalOptions.privateKey || process.env.PRIVATE_KEY;
			const storageType =
				options.storage || globalOptions.storage || process.env.STORAGE_TYPE || 'json';
			const storagePath =
				options.storagePath || globalOptions.storagePath || process.env.STORAGE_PATH || './data';

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

			// Get chain
			const chain = await getChain(rpcUrl);

			// Parse and validate parameters
			const params: Record<string, any> = {};
			for (const [fieldName, field] of Object.entries(shape)) {
				const actualField = isOptionalField(field as z.ZodTypeAny)
					? (field as z.ZodOptional<any>).unwrap()
					: field;

				if (actualField instanceof z.ZodObject) {
					// Handle nested object - reconstruct from flattened options
					const nestedResult: Record<string, any> = {};
					const nestedShape = actualField.shape;
					for (const [nestedKey, nestedField] of Object.entries(nestedShape)) {
						const optionName = `${fieldName}-${nestedKey}`;
						if (options[optionName] !== undefined) {
							nestedResult[nestedKey] = parseOptionValue(nestedField, options[optionName]);
						}
					}
					params[fieldName] = nestedResult;
				} else {
					const value = options[fieldName];
					if (value !== undefined) {
						params[fieldName] = parseOptionValue(actualField, value);
					}
				}
			}

			const validatedParams = await parseAndValidateParams(tool.schema, params);

			// Create environment and execute
			const env = await createCliToolEnvironment({
				chain,
				privateKey: privateKey as `0x${string}`,
				gameContract: gameContract as `0x${string}`,
				ethereum,
				storageConfig: {
					type: storageType as 'json' | 'sqlite',
					dataDir: storagePath,
				},
			});

			const result = await tool.execute(env, validatedParams);
			formatToolResult(result);
		} catch (error) {
			if (error instanceof Error) {
				console.error(
					JSON.stringify(
						{error: error.message, ...(error.stack ? {stack: error.stack} : {})},
						null,
						2,
					),
				);
			} else {
				console.error(JSON.stringify({error: String(error)}, null, 2));
			}
			process.exit(1);
		}
	});
}

/**
 * Register all tool commands from a tools object
 */
export function registerAllToolCommands(program: Command, tools: Record<string, Tool>): void {
	for (const [toolName, tool] of Object.entries(tools)) {
		// Skip the file that's not a tool
		if (toolName === 'default') continue;

		// Keep snake_case for CLI command names (1:1 mapping with tool names)
		generateToolCommand(program, toolName, tool);
	}
}
