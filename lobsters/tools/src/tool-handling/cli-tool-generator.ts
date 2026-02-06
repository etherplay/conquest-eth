import {Command} from 'commander';
import {z} from 'zod';
import type {Tool, ToolEnvironment, ToolSchema} from './types.js';
import {getClients} from 'tools-ethereum/helpers';
import {getChain} from 'tools-ethereum/helpers';
import {createSpaceInfo} from '../contracts/space-info.js';
import {JsonFleetStorage} from '../storage/json-storage.js';
import {FleetManager} from '../fleet/manager.js';
import {PlanetManager} from '../planet/manager.js';
import type {ClientsWithOptionalWallet, GameContract, StorageConfig} from '../types.js';
import {SpaceInfo} from 'conquest-eth-v0-contracts';
import {Abi_IOuterSpace} from 'conquest-eth-v0-contracts/abis/IOuterSpace.js';

/**
 * CLI configuration parameters
 */
export interface CliConfig {
	chain: any;
	privateKey?: `0x${string}`;
	gameContract: `0x${string}`;
	storageConfig: StorageConfig;
}

/**
 * Convert Zod schema field to commander.js option definition
 */
function zodFieldToOption(name: string, field: z.ZodTypeAny): string {
	// Handle boolean flags - no value required
	if (field instanceof z.ZodBoolean) {
		return `--${name}`;
	}
	// All other types use <value> to accept explicit values
	return `--${name} <value>`;
}

/**
 * Check if a ZodUnion contains a number type
 */
function unionContainsNumber(field: z.ZodUnion<any>): boolean {
	for (const option of field.options) {
		if (option instanceof z.ZodNumber) {
			return true;
		}
	}
	return false;
}

/**
 * Parse option value based on Zod type
 */
function parseOptionValue(field: z.ZodTypeAny, value: any): any {
	// Handle array types - parse comma-separated values or JSON arrays
	if (field instanceof z.ZodArray) {
		if (typeof value === 'string') {
			// Check if it's a JSON array
			if (value.trim().startsWith('[')) {
				try {
					return JSON.parse(value);
				} catch {
					// Fall through to comma-separated parsing
				}
			}
			// Check if array element type is number
			const elementType = field.element;
			const items = value.split(',').map((v) => v.trim());
			if (elementType instanceof z.ZodNumber) {
				return items.map((v) => Number(v));
			}
			return items;
		}
		return value;
	}

	// Handle number types
	if (field instanceof z.ZodNumber) {
		return Number(value);
	}

	// Handle boolean types - support string "true"/"false"
	if (field instanceof z.ZodBoolean) {
		if (typeof value === 'string') {
			return value.toLowerCase() === 'true';
		}
		return value === true;
	}

	// Handle union types - try to convert to number if the union includes a number type
	if (field instanceof z.ZodUnion) {
		if (unionContainsNumber(field)) {
			// If the value looks like a number, convert it
			const numValue = Number(value);
			if (!isNaN(numValue) && typeof value === 'string' && /^\d+$/.test(value)) {
				return numValue;
			}
		}
		// Otherwise return as-is (likely a literal string like 'latest')
		return value;
	}

	// Default to string
	return value;
}

/**
 * Extract description from Zod schema field
 */
function getFieldDescription(field: z.ZodTypeAny): string {
	const description = (field as any).description;
	return description || 'No description available';
}

/**
 * Check if a Zod field is optional
 */
function isOptionalField(field: z.ZodTypeAny): boolean {
	return field instanceof z.ZodOptional || field.isOptional?.();
}

/**
 * Unwrap Zod wrappers (Optional, Default) to get the inner type
 */
function unwrapZodType(field: z.ZodTypeAny): z.ZodTypeAny {
	if (field instanceof z.ZodOptional) {
		return unwrapZodType(field.unwrap() as z.ZodTypeAny);
	}
	if (field instanceof z.ZodDefault) {
		return unwrapZodType(field._def.innerType as z.ZodTypeAny);
	}
	return field;
}

/**
 * Check if schema is a ZodUnion of ZodObjects
 */
function isSchemaUnion(
	schema: ToolSchema,
): schema is z.ZodUnion<readonly [z.ZodObject<any>, ...z.ZodObject<any>[]]> {
	return schema instanceof z.ZodUnion;
}

/**
 * Extract all unique fields from a schema (handles both ZodObject and ZodUnion)
 * For unions, collects all fields from all options
 * Returns a map of fieldName -> {field, isOptional}
 */
function extractSchemaFields(
	schema: ToolSchema,
): Map<string, {field: z.ZodTypeAny; isOptional: boolean}> {
	const fields = new Map<string, {field: z.ZodTypeAny; isOptional: boolean}>();

	if (isSchemaUnion(schema)) {
		// For unions, collect all fields from all options
		// A field is required only if it's required in ALL options
		const allOptions = schema.options as readonly z.ZodObject<any>[];

		// First pass: collect all unique field names
		const allFieldNames = new Set<string>();
		for (const option of allOptions) {
			for (const fieldName of Object.keys(option.shape)) {
				allFieldNames.add(fieldName);
			}
		}

		// Second pass: for each field, determine if it's optional
		// A field is required only if it exists and is required in ALL options
		for (const fieldName of allFieldNames) {
			let field: z.ZodTypeAny | undefined;
			let isOptionalInAnyOption = false;
			let missingInSomeOption = false;

			for (const option of allOptions) {
				const optionField = option.shape[fieldName] as z.ZodTypeAny | undefined;
				if (optionField === undefined) {
					missingInSomeOption = true;
				} else {
					field = optionField;
					if (isOptionalField(optionField)) {
						isOptionalInAnyOption = true;
					}
				}
			}

			if (field) {
				// Field is optional in CLI if it's optional in any option OR missing in some option
				fields.set(fieldName, {
					field,
					isOptional: isOptionalInAnyOption || missingInSomeOption,
				});
			}
		}
	} else {
		// Simple ZodObject - extract fields directly
		const shape = schema.shape;
		for (const [fieldName, field] of Object.entries(shape)) {
			fields.set(fieldName, {
				field: field as z.ZodTypeAny,
				isOptional: isOptionalField(field as z.ZodTypeAny),
			});
		}
	}

	return fields;
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
	schema: ToolSchema,
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
 * Replacer function for JSON.stringify to handle BigInt values
 */
function bigIntReplacer(_key: string, value: any): any {
	if (typeof value === 'bigint') {
		return value.toString();
	}
	return value;
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
		console.log(JSON.stringify(result.result, bigIntReplacer, 2));
	} else {
		console.error('Error:', result.error);
		if (result.stack) {
			console.error('Stack:', result.stack);
		}
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
	// Extract fields from schema (handles both ZodObject and ZodUnion)
	const schemaFields = extractSchemaFields(tool.schema);

	// Create the command
	const cmd = program.command(toolName).description(tool.description);

	// Add options for each schema field
	for (const [fieldName, {field, isOptional}] of schemaFields) {
		// Unwrap optional/default wrappers to get the actual type
		const actualField = unwrapZodType(field);
		const optionDef = zodFieldToOption(fieldName, actualField);
		const description = getFieldDescription(actualField);

		// Add the option
		if (isOptional) {
			cmd.option(optionDef, description);
		} else {
			cmd.requiredOption(optionDef, description);
		}
	}

	// Add --rpc-url option (can override global)
	cmd.option('--rpc-url <url>', 'RPC URL for the Ethereum network (overrides global)');
	// Add --game-contract option (can override global)
	cmd.option('--game-contract <address>', 'contract address (overrides global)');
	// Add --storage option (can override global)
	cmd.option('--storage <type>', 'storage type (overrides global)');
	// Add --storage-path option (can override global)
	cmd.option('--storage-path <type>', 'storage type (overrides global)');

	cmd.action(async (options: Record<string, any>) => {
		try {
			const globalOptions = program.opts();

			// Get global options
			const rpcUrl = options.rpcUrl || globalOptions.rpcUrl || process.env.RPC_URL;
			const gameContract =
				options.gameContract || globalOptions.gameContract || process.env.GAME_CONTRACT;

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

			const privateKey = process.env.PRIVATE_KEY;

			// Validate PRIVATE_KEY format if provided
			if (privateKey && !privateKey.startsWith('0x')) {
				console.error('Error: PRIVATE_KEY must start with 0x');
				process.exit(1);
			}

			// Parse and validate parameters against schema
			const params: Record<string, any> = {};

			for (const [fieldName, {field}] of schemaFields) {
				// Unwrap optional/default wrappers to get the actual type for parsing
				const actualField = unwrapZodType(field);
				const value = options[fieldName];

				if (value !== undefined) {
					params[fieldName] = parseOptionValue(actualField, value);
				}
			}

			// Validate against schema
			const validatedParams = await parseAndValidateParams(tool.schema, params);

			// Get chain
			const chain = await getChain(rpcUrl);

			// Create environment and execute
			const env = await createCliToolEnvironment({
				chain,
				privateKey: privateKey as `0x${string}`,
				gameContract: gameContract as `0x${string}`,
				storageConfig: {
					type: storageType as 'json' | 'sqlite',
					dataDir: storagePath,
				},
			});

			const result = await tool.execute(env, validatedParams);
			formatToolResult(result);
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error:', error.message);
				if (error.stack) {
					console.error('Stack:', error.stack);
				}
			} else {
				console.error('Error:', String(error));
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
