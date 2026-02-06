import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {Tool, ToolResult, ToolEnvironment} from './types.js';
import {CallToolResult} from '@modelcontextprotocol/sdk/types.js';

/**
 * Create tool environment with MCP logging support
 * @template TEnv - Environment properties type
 * @param server - MCP server instance for sending logging messages
 * @param env - Environment properties to spread into the tool environment
 * @param sessionId - Optional session ID for targeting specific client
 */
function createToolEnvironmentWithMCP<TEnv extends Record<string, any>>(
	server: McpServer,
	env: TEnv,
	sessionId?: string,
): ToolEnvironment<TEnv> {
	return {
		sendStatus: async (message: string) => {
			try {
				await server.sendLoggingMessage(
					{
						level: 'info',
						data: message,
					},
					sessionId,
				);
			} catch (error) {
				// Silently ignore logging errors to not disrupt tool execution
			}
		},
		...env,
	};
}

/**
 * Convert ToolResult to CallToolResult format
 */
function convertToCallToolResult(result: ToolResult): CallToolResult {
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

/**
 * Register tool with MCP server
 * @template TEnv - Environment properties type
 */
export function registerMCPTool<TEnv extends Record<string, any>>({
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
		async (params: unknown, mcpExtra: any) => {
			// Create tool environment with proper MCP sendStatus
			const toolEnv = createToolEnvironmentWithMCP(server, env, mcpExtra?.sessionId);

			try {
				const result = await tool.execute(toolEnv, params as any);
				return convertToCallToolResult(result);
			} catch (error) {
				const errorResult: {success: false; error: string; stack?: string} = {
					success: false,
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				};
				return convertToCallToolResult(errorResult);
			}
		},
	);
}

/**
 * Register all tool from a tools object
 * @template TEnv - Environment type passed to tools
 */
export function registerAllMCPTools<TEnv extends Record<string, any>>({
	server,
	tools,
	env,
}: {
	server: McpServer;
	tools: Record<string, Tool<any, TEnv>>;
	env: TEnv;
}): void {
	for (const [name, tool] of Object.entries(tools)) {
		// Skip the file that's not a tool
		if (name === 'default') continue;

		registerMCPTool({server, name, tool, env});
	}
}
