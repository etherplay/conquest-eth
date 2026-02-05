import type {Tool, ToolEnvironment} from '../types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import type {FleetManager} from '../fleet/manager.js';
import type {PlanetManager} from '../planet/manager.js';
import {convertToCallToolResult} from '../types.js';

// Helper function to handle BigInt serialization in JSON.stringify
export function stringifyWithBigInt(obj: any, space?: number): string {
	return JSON.stringify(
		obj,
		(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
		space,
	);
}

// Create tool environment with sendStatus
export function createToolEnvironment(
	server: McpServer,
	fleetManager: FleetManager,
	planetManager: PlanetManager,
): ToolEnvironment {
	return {
		sendStatus: async (_message: string) => {
			// TODO: Implement progress notifications when sessionId is available
			// For now, this is a no-op since we don't have sessionId in the current architecture
		},
		fleetManager,
		planetManager,
	};
}

// Register tool with MCP server
export function registerTool({
	server,
	name,
	tool,
	fleetManager,
	planetManager,
}: {
	server: McpServer;
	name: string;
	tool: Tool<any>;
	fleetManager: FleetManager;
	planetManager: PlanetManager;
}): void {
	server.registerTool(
		name,
		{
			description: tool.description,
			inputSchema: tool.schema as any,
		},
		async (params: unknown) => {
			const env = createToolEnvironment(server, fleetManager, planetManager);

			const result = await tool.execute(env, params as any);
			return convertToCallToolResult(result);
		},
	);
}
