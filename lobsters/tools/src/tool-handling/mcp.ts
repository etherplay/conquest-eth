import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {Tool, ToolResult} from './types.js';
import {createToolEnvironment} from './index.js';
import {CallToolResult} from '@modelcontextprotocol/sdk/types.js';

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
		async (params: unknown) => {
			const toolEnv = createToolEnvironment(env);

			const result = await tool.execute(toolEnv, params as any);
			return convertToCallToolResult(result);
		},
	);
}

/**
 * Register all tool from a tools object
 * @template TEnv - Environment type passed to tools
 */
export function registerAllMCPTools<TEnv extends Record<string, any>>({
	server,
	name,
	tools,
	env,
}: {
	server: McpServer;
	name: string;
	tools: Record<string, Tool<any, TEnv>>;
	env: TEnv;
}): void {
	for (const [toolName, tool] of Object.entries(tools)) {
		// Skip the file that's not a tool
		if (name === 'default') continue;

		registerMCPTool({server, name, tool, env});
	}
}
