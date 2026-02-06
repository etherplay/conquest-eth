import {z} from 'zod';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {FleetManager} from '../fleet/manager.js';
import {PlanetManager} from '../planet/manager.js';

/**
 * Environment provided to tool execute functions
 */
export type ToolEnvironment = {
	/** function to send status updates during tool execution */
	sendStatus: (message: string) => Promise<void>;
	// Fleet manager for fleet operations
	fleetManager: FleetManager;
	// Planet manager for planet operations
	planetManager: PlanetManager;
};

/**
 * Result returned by tool execute functions
 * Success case: {success: true, result: Record<string, any>}
 * Error case: {success: false, error: string, stack?: string}
 */
export type ToolResult =
	| {success: true; result: Record<string, any>}
	| {success: false; error: string; stack?: string};

/**
 * Schema types that can be used for tool input parameters
 * Supports ZodObject directly or ZodUnion of ZodObjects (for mutually exclusive params)
 */
export type ToolSchema =
	| z.ZodObject<any>
	| z.ZodUnion<readonly [z.ZodObject<any>, ...z.ZodObject<any>[]]>;

/**
 * Tool definition with execute, schema, and description
 * @template S - Zod schema type for input parameters
 */
export type Tool<S extends ToolSchema = z.ZodObject<any>> = {
	/** Description of what the tool does */
	description: string;
	/** Zod schema for input parameters */
	schema: S;
	/**
	 * Execute function that receives environment and parameters
	 * @param env - Tool environment with clients and optional sendStatus
	 * @param params - Parameters inferred from schema
	 * @returns ToolResult with success/error state
	 */
	execute: (env: ToolEnvironment, params: z.infer<S>) => Promise<ToolResult>;
};

/**
 * Helper function to create a tool with automatic type inference
 * Use this instead of directly creating Tool objects to get proper TypeScript types
 * @template S - Zod schema type for input parameters
 */
export function createTool<S extends ToolSchema>(config: {
	description: string;
	schema: S;
	execute: (env: ToolEnvironment, params: z.infer<S>) => Promise<ToolResult>;
}): Tool<S> {
	return config;
}

/**
 * Parameters for tool registration
 */
export type RegisterToolParams<S extends ToolSchema> = {
	/** MCP server instance */
	server: McpServer;
	/** Tool name (snake_case) */
	name: string;
	/** Tool definition */
	tool: Tool<S>;
};

/**
 * Convert ToolResult to CallToolResult format
 */
export function convertToCallToolResult(result: ToolResult): CallToolResult {
	if (result.success === false) {
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
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
				type: 'text',
				text: JSON.stringify(
					result.result,
					(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
					2,
				),
			},
		],
	};
}
