import {describe, it, expect} from 'vitest';
import {createServer} from '../src/index.js';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {getChain} from 'tools-ethereum/helpers';

const chain = await getChain('https://eth.llamarpc.com');

describe('MCP Server', () => {
	it('should create server instance', () => {
		const server = createServer(
			{
				chain,
				privateKey: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				gameContract: '0x1234567890abcdef1234567890abcdef12345678',
			},
			{
				ethereum: true,
			},
		);
		expect(server).toBeInstanceOf(McpServer);
	});
});
