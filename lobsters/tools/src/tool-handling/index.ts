import type {Tool, ToolEnvironment} from './types.js';
import {convertToCallToolResult} from './types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

// Helper function to handle BigInt serialization in JSON.stringify
export function stringifyWithBigInt(obj: any, space?: number): string {
	return JSON.stringify(
		obj,
		(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
		space,
	);
}

/**
 * Create tool environment with sendStatus
 * @template TEnv - Environment properties type
 * @param server - MCP server instance
 * @param env - Environment properties to spread into the tool environment
 */
export function createToolEnvironment<TEnv extends Record<string, any>>(
	server: McpServer,
	env: TEnv,
): ToolEnvironment<TEnv> {
	return {
		sendStatus: async (_message: string) => {
			// TODO: Implement progress notifications when sessionId is available
			// For now, this is a no-op since we don't have sessionId in the current architecture
		},
		...env,
	};
}

/**
 * Register tool with MCP server
 * @template TEnv - Environment properties type
 */
export function registerTool<TEnv extends Record<string, any>>({
	server,
	name,
	tool,
	env,
}: {
	server: McpServer;
	name: string;
	tool: Tool<any, TEnv>;
	env: TEnv;
}): void {
	server.registerTool(
		name,
		{
			description: tool.description,
			inputSchema: tool.schema as any,
		},
		async (params: unknown) => {
			const toolEnv = createToolEnvironment(server, env);

			const result = await tool.execute(toolEnv, params as any);
			return convertToCallToolResult(result);
		},
	);
}
