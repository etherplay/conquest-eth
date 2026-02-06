import {z} from 'zod';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Environment provided to tool execute functions
 * Generic type TEnv allows customization of the environment properties
 * @template TEnv - Additional environment properties spread into the environment
 */
export type ToolEnvironment<TEnv extends Record<string, any> = Record<string, any>> = {
	/** function to send status updates during tool execution */
	sendStatus: (message: string) => Promise<void>;
} & TEnv;

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
 * @template TEnv - Environment type passed to execute function
 */
export type Tool<
	S extends ToolSchema = z.ZodObject<any>,
	TEnv extends Record<string, any> = Record<string, any>,
> = {
	/** Description of what the tool does */
	description: string;
	/** Zod schema for input parameters */
	schema: S;
	/**
	 * Execute function that receives environment and parameters
	 * @param env - Tool environment with sendStatus and custom properties
	 * @param params - Parameters inferred from schema
	 * @returns ToolResult with success/error state
	 */
	execute: (env: ToolEnvironment<TEnv>, params: z.infer<S>) => Promise<ToolResult>;
};

/**
 * Helper function to create a tool with automatic type inference
 * Use this instead of directly creating Tool objects to get proper TypeScript types
 * @template S - Zod schema type for input parameters
 * @template TEnv - Environment type passed to execute function
 */
export function createTool<
	S extends ToolSchema,
	TEnv extends Record<string, any> = Record<string, any>,
>(config: {
	description: string;
	schema: S;
	execute: (env: ToolEnvironment<TEnv>, params: z.infer<S>) => Promise<ToolResult>;
}): Tool<S, TEnv> {
	return config;
}

/**
 * Parameters for tool registration
 * @template S - Zod schema type for input parameters
 * @template TEnv - Environment type passed to execute function
 */
export type RegisterToolParams<
	S extends ToolSchema,
	TEnv extends Record<string, any> = Record<string, any>,
> = {
	/** MCP server instance */
	server: McpServer;
	/** Tool name (snake_case) */
	name: string;
	/** Tool definition */
	tool: Tool<S, TEnv>;
};
