import {Command} from 'commander';
import {z} from 'zod';
import type {Tool, ToolSchema} from './types.js';
import {createToolEnvironmentFromFactory} from './index.js';

/**
 * Factory that create the Environment
 * @template TEnv - Environment type passed to tools
 */
export type EnvFactory<TEnv extends Record<string, any>> = () => Promise<TEnv> | TEnv;

/**
 * Unwrap Zod wrappers (Optional, Default) to get the inner type
 * (Defined early as it's used by other functions)
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
 * Check if a Zod object schema represents a coordinate type (has only x, y and optionally z number fields)
 */
function isCoordinateSchema(field: z.ZodTypeAny): {type: '2d' | '3d'} | null {
	if (!(field instanceof z.ZodObject)) {
		return null;
	}

	const shape = field.shape;
	const keys = Object.keys(shape);

	// Check for 2D coordinates (x, y)
	if (keys.length === 2 && keys.includes('x') && keys.includes('y')) {
		const xField = unwrapZodType(shape.x as z.ZodTypeAny);
		const yField = unwrapZodType(shape.y as z.ZodTypeAny);
		if (xField instanceof z.ZodNumber && yField instanceof z.ZodNumber) {
			return {type: '2d'};
		}
	}

	// Check for 3D coordinates (x, y, z)
	if (keys.length === 3 && keys.includes('x') && keys.includes('y') && keys.includes('z')) {
		const xField = unwrapZodType(shape.x as z.ZodTypeAny);
		const yField = unwrapZodType(shape.y as z.ZodTypeAny);
		const zField = unwrapZodType(shape.z as z.ZodTypeAny);
		if (
			xField instanceof z.ZodNumber &&
			yField instanceof z.ZodNumber &&
			zField instanceof z.ZodNumber
		) {
			return {type: '3d'};
		}
	}

	return null;
}

/**
 * Check if a Zod schema represents an array of coordinate objects
 * Returns the coordinate type if it's a coordinate array, null otherwise
 */
function isCoordinateArraySchema(field: z.ZodTypeAny): {type: '2d' | '3d'} | null {
	if (!(field instanceof z.ZodArray)) {
		return null;
	}

	// Check if the array element is a coordinate object
	const elementType = unwrapZodType(field.element as z.ZodTypeAny);
	return isCoordinateSchema(elementType);
}

/**
 * Convert camelCase to kebab-case for CLI option names
 */
function camelToKebabCase(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert Zod schema field to commander.js option definition
 */
function zodFieldToOption(name: string, field: z.ZodTypeAny): string {
	const kebabName = camelToKebabCase(name);
	// Handle boolean flags - no value required
	if (field instanceof z.ZodBoolean) {
		return `--${kebabName}`;
	}
	// Handle coordinate array - use single comma-separated string format
	const coordArrayInfo = isCoordinateArraySchema(field);
	if (coordArrayInfo) {
		// Single string value containing all coordinates as comma-separated values
		// e.g., "2,5,-3,4" for 2D or "2,5,1,-3,4,2" for 3D
		return `--${kebabName} <coords>`;
	}
	// Handle single coordinate objects - use <x,y> or <x,y,z> format
	const coordInfo = isCoordinateSchema(field);
	if (coordInfo) {
		if (coordInfo.type === '3d') {
			return `--${kebabName} <x,y,z>`;
		}
		return `--${kebabName} <x,y>`;
	}
	// All other types use <value> to accept explicit values
	return `--${kebabName} <value>`;
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
 * Parse coordinate string (e.g., "10,20" or "10,20,30") into an object
 */
function parseCoordinateString(
	value: string,
	type: '2d' | '3d',
): {x: number; y: number; z?: number} | null {
	const parts = value.split(',').map((v) => v.trim());

	if (type === '2d' && parts.length === 2) {
		const x = Number(parts[0]);
		const y = Number(parts[1]);
		if (!isNaN(x) && !isNaN(y)) {
			return {x, y};
		}
	} else if (type === '3d' && parts.length === 3) {
		const x = Number(parts[0]);
		const y = Number(parts[1]);
		const z = Number(parts[2]);
		if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
			return {x, y, z};
		}
	}

	return null;
}

/**
 * Parse coordinate array string into an array of coordinate objects.
 * Supports multiple formats:
 * - All commas: "2,5,-3,4" or "2,5,1,-3,4,2"
 * - Space-separated tuples: "2,5 -3,4" or "2,5,1 -3,4,2"
 * - Mixed with comma and space: "2,5, -3,4" or "2,5,-3,4, 1,2"
 */
function parseCoordinateArrayString(
	value: string,
	type: '2d' | '3d',
): {x: number; y: number; z?: number}[] {
	const coordinatesPerPoint = type === '3d' ? 3 : 2;
	const result: {x: number; y: number; z?: number}[] = [];

	// First, try to split by space to get potential tuples
	// This handles formats like "2,5 -3,4" or "2,5, -3,4"
	const spaceParts = value.trim().split(/\s+/);

	// Collect all numeric values
	const allValues: number[] = [];

	for (const part of spaceParts) {
		// Each part could be a single tuple like "2,5" or "-3,4" or just a number
		// Split by comma and collect all values
		const commaParts = part.split(',').map((v) => v.trim()).filter((v) => v !== '');
		for (const commaPart of commaParts) {
			const num = Number(commaPart);
			if (isNaN(num)) {
				throw new Error(`Invalid coordinate value: "${commaPart}" is not a number`);
			}
			allValues.push(num);
		}
	}

	if (allValues.length % coordinatesPerPoint !== 0) {
		throw new Error(
			`Invalid coordinate count: expected multiple of ${coordinatesPerPoint} values, got ${allValues.length}`,
		);
	}

	for (let i = 0; i < allValues.length; i += coordinatesPerPoint) {
		const x = allValues[i];
		const y = allValues[i + 1];

		if (type === '3d') {
			const z = allValues[i + 2];
			result.push({x, y, z});
		} else {
			result.push({x, y});
		}
	}

	return result;
}

/**
 * Split a string by comma, respecting escaped commas (using backslash).
 * Escaped commas (\,) are preserved as literal commas in the result.
 * @param value - The string to split
 * @returns An array of trimmed strings
 */
function splitByCommaWithEscaping(value: string): string[] {
	const items: string[] = [];
	let current = '';
	let i = 0;

	while (i < value.length) {
		// Check for escaped comma
		if (value[i] === '\\' && i + 1 < value.length && value[i + 1] === ',') {
			// Add literal comma to current item
			current += ',';
			i += 2; // Skip both backslash and comma
		} else if (value[i] === ',') {
			// Unescaped comma - end of current item
			items.push(current.trim());
			current = '';
			i++;
		} else {
			current += value[i];
			i++;
		}
	}

	// Don't forget the last item
	items.push(current.trim());

	return items;
}

/**
 * Parse option value based on Zod type
 */
function parseOptionValue(field: z.ZodTypeAny, value: any): any {
	// Handle coordinate array - parse a single comma-separated string into array of coordinates
	const coordArrayInfo = isCoordinateArraySchema(field);
	if (coordArrayInfo) {
		// Commander.js gives us a single string value
		if (typeof value === 'string') {
			return parseCoordinateArrayString(value, coordArrayInfo.type);
		}
		// Handle array case (if somehow passed as array)
		if (Array.isArray(value)) {
			// Join array elements and parse as comma-separated
			const joined = value.join(',');
			return parseCoordinateArrayString(joined, coordArrayInfo.type);
		}
		throw new Error(
			`Invalid coordinate format. Expected comma-separated string: e.g., "2,5,-3,4" for 2D or "2,5,1,-3,4,2" for 3D`,
		);
	}

	// Handle single coordinate objects - parse "x,y" or "x,y,z" format
	const coordInfo = isCoordinateSchema(field);
	if (coordInfo && typeof value === 'string') {
		const parsed = parseCoordinateString(value, coordInfo.type);
		if (parsed) {
			return parsed;
		}
		// If parsing fails, throw an error with helpful message
		throw new Error(
			`Invalid coordinate format for value "${value}". Expected format: ${coordInfo.type === '3d' ? 'x,y,z' : 'x,y'}`,
		);
	}

	// Handle array types - parse comma-separated values or JSON arrays
	if (field instanceof z.ZodArray) {
		if (typeof value === 'string') {
			// Try to parse as JSON array first
			const trimmedValue = value.trim();
			if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
				try {
					const parsed = JSON.parse(trimmedValue);
					if (Array.isArray(parsed)) {
						// Check if array element type is number and convert if needed
						const elementType = field.element;
						if (elementType instanceof z.ZodNumber) {
							return parsed.map((v) => Number(v));
						}
						return parsed;
					}
				} catch {
					// If JSON parsing fails, fall through to comma-separated parsing
				}
			}
			// Check if array element type is number
			const elementType = field.element;
			// Use escape-aware splitting for comma-separated values
			const items = splitByCommaWithEscaping(value);
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
function formatToolCLIResult(result: {
	success: boolean;
	result?: any;
	error?: string;
	stack?: string;
}): void {
	if (result.success) {
		console.log(JSON.stringify(result.result, bigIntReplacer, 2));
	} else {
		console.error(JSON.stringify({error: result.error, stack: result.stack}, bigIntReplacer, 2));
		process.exit(1);
	}
}

/**
 * Generate a single tool command from tool definition
 * @template TEnv - Environment type passed to tools
 */
export function generateToolCommand<TEnv extends Record<string, any>>(
	program: Command,
	toolName: string,
	tool: Tool<z.ZodObject<any>, TEnv>,
	envFactory: EnvFactory<TEnv>,
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

	cmd.action(async (options: Record<string, any>) => {
		try {
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

			// Create environment and execute
			const env = await createToolEnvironmentFromFactory(envFactory);

			const result = await tool.execute(env, validatedParams);
			formatToolCLIResult(result);
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
 * @template TEnv - Environment type passed to tools
 */
export function registerAllToolCommands<TEnv extends Record<string, any>>(
	program: Command,
	tools: Record<string, Tool<any, TEnv>>,
	envFactory: EnvFactory<TEnv>,
): void {
	for (const [toolName, tool] of Object.entries(tools)) {
		// Skip the file that's not a tool
		if (toolName === 'default') continue;

		// Keep snake_case for CLI command names (1:1 mapping with tool names)
		generateToolCommand(program, toolName, tool, envFactory);
	}
}
