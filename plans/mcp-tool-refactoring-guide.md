# MCP Tool Refactoring Guide

This guide explains how to refactor MCP (Model Context Protocol) server tools from inline registration to independent, type-safe tool files.

## Overview

The goal is to convert tools that are currently registered directly with the MCP server into self-contained tool objects that:
1. Define their own schema (using Zod)
2. Have an execute function that returns plain JSON objects
3. Are organized in individual files for better maintainability
4. Provide full TypeScript type inference for parameters

## Architecture Pattern

### Core Types

Create a `types.ts` file with the following core types:

```typescript
import {z} from 'zod';
import type {PublicClient} from 'viem'; // or your framework's client types
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

// Environment provided to tool execute functions
export type ToolEnvironment = {
  // Function to send status updates during tool execution (required)
  sendStatus: (message: string) => Promise<void>;
  // Your framework's client(s) - customize for your project
  client: YourClientType;
  // Optional additional clients or services
  walletClient?: WalletClientType;
};

// Result returned by tool execute functions
export type ToolResult =
  | {success: true; result: Record<string, any>}
  | {success: false; error: string; stack?: string};

// Tool definition with execute, schema, and description
export type Tool<S extends z.ZodObject<any> = z.ZodObject<any>> = {
  description: string;
  schema: S;
  execute: (env: ToolEnvironment, params: z.infer<S>) => Promise<ToolResult>;
};

// Helper function to create a tool with automatic type inference
export function createTool<S extends z.ZodObject<any>>(config: {
  description: string;
  schema: S;
  execute: (env: ToolEnvironment, params: z.infer<S>) => Promise<ToolResult>;
}): Tool<S> {
  return config;
}

// Convert ToolResult to CallToolResult format
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
        text: JSON.stringify(result.result, null, 2),
      },
    ],
  };
}
```

### Helper Functions (helpers.ts)

```typescript
import {z} from 'zod';
import type {Tool, ToolEnvironment} from './types.js';
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';

// Create tool environment with sendStatus
export function createToolEnvironment(
  server: McpServer,
  client: YourClientType,
  walletClient?: WalletClientType,
  sessionId?: string,
): ToolEnvironment {
  return {
    sendStatus: async (message: string) => {
      if (sessionId) {
        await server.sendRequest({
          method: 'notifications/progress',
          params: {
            sessionId,
            message,
          },
        });
      }
    },
    client,
    walletClient,
  };
}

// Register tool with MCP server
export function registerTool<S extends z.ZodObject<any>>({
  server,
  name,
  tool,
}: {
  server: McpServer;
  name: string;
  tool: Tool<S>;
}): void {
  server.registerTool(name, {
    description: tool.description,
    inputSchema: tool.schema,
  }, async (params, mcpExtra) => {
    const env = createToolEnvironment(
      server,
      // Pass your clients here
      yourClient,
      walletClient,
      mcpExtra.sessionId,
    );

    const result = await tool.execute(env, params);
    return convertToCallToolResult(result);
  });
}
```

## Step-by-Step Refactoring

### Step 1: Create the Tool Files Directory

Create a `tools/` directory (or `src/tools/`) to hold individual tool files.

```bash
mkdir -p src/tools
```

### Step 2: Create Individual Tool Files

For each tool, create a separate file using the `createTool` helper function.

**File naming convention:** Use `snake_case` (e.g., `get_user.ts`, `send_message.ts`)

**Example tool file (`src/tools/get_user.ts`):**

```typescript
import {z} from 'zod';
import {createTool} from '../types.js';

export const get_user = createTool({
  description: 'Get user information by ID',
  schema: z.object({
    userId: z.string().describe('User ID to fetch'),
    includeDetails: z.boolean().optional().describe('Include detailed information'),
  }),
  execute: async (env, {userId, includeDetails}) => {
    // Access your client from env
    const user = await env.client.getUser(userId);

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      result: {
        id: user.id,
        name: user.name,
        ...(includeDetails ? {details: user.details} : {}),
      },
    };
  },
});
```

**Key points:**
- Use `createTool` wrapper for automatic type inference
- Destructure parameters in the execute function for full TypeScript types
- Return `{success: true, result: {...}}` on success
- Return `{success: false, error: string}` on failure
- Access your framework's client via `env.client`

### Step 3: Create Tool Index File

Create `src/tools/index.ts` to export all tools:

```typescript
export * from './get_user.js';
export * from './send_message.js';
export * from './delete_item.js';
// Add all your tool exports here
```

### Step 4: Update Server Registration

Replace your inline tool registration with auto-registration:

**Before (inline registration):**
```typescript
server.registerTool('get_user', {
  description: 'Get user information',
  inputSchema: z.object({
    userId: z.string(),
  }),
}, async (params) => {
  // Tool logic here
  // Returns CallToolResult directly
});
```

**After (auto-registration):**
```typescript
import * as tools from './tools/index.js';
import {registerTool} from './helpers.js';

// Register all tools
for (const [name, tool] of Object.entries(tools)) {
  registerTool({
    server,
    name,
    tool,
  });
}
```

## Tool Patterns

### Simple Query Tool

```typescript
export const get_item = createTool({
  description: 'Get an item by ID',
  schema: z.object({
    itemId: z.string().describe('Item ID'),
  }),
  execute: async (env, {itemId}) => {
    const item = await env.client.getItem(itemId);
    return {
      success: true,
      result: {item},
    };
  },
});
```

### Tool with Optional Parameters

```typescript
export const search_items = createTool({
  description: 'Search for items',
  schema: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Maximum results'),
    offset: z.number().optional().describe('Pagination offset'),
  }),
  execute: async (env, {query, limit = 10, offset = 0}) => {
    const results = await env.client.search(query, {limit, offset});
    return {
      success: true,
      result: {results, count: results.length},
    };
  },
});
```

### Tool with Error Handling

```typescript
export const create_item = createTool({
  description: 'Create a new item',
  schema: z.object({
    name: z.string().describe('Item name'),
    value: z.number().describe('Item value'),
  }),
  execute: async (env, {name, value}) => {
    try {
      const item = await env.client.createItem({name, value});
      return {
        success: true,
        result: {id: item.id, name, value},
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
  },
});
```

### Tool with Progress Updates

```typescript
// Tool file:
export const process_data = createTool({
  description: 'Process data with progress updates',
  schema: z.object({
    dataId: z.string().describe('Data ID to process'),
  }),
  execute: async (env, {dataId}) => {
    await env.sendStatus('Starting processing...');
    
    const steps = ['validate', 'transform', 'save'];
    for (const step of steps) {
      await env.sendStatus(`Processing: ${step}`);
      await env.client.processStep(dataId, step);
    }
    
    await env.sendStatus('Complete!');
    
    return {
      success: true,
      result: {dataId, status: 'processed'},
    };
  },
});
```

### Tool with Multiple Clients

```typescript
export const sync_data = createTool({
  description: 'Sync data between systems',
  schema: z.object({
    sourceId: z.string().describe('Source system ID'),
  }),
  execute: async (env, {sourceId}) => {
    // Use primary client
    const data = await env.client.getData(sourceId);
    
    // Use secondary client if available
    if (env.secondaryClient) {
      await env.secondaryClient.store(data);
    }
    
    return {
      success: true,
      result: {synced: true},
    };
  },
});
```

## Migration Checklist

- [ ] Create `types.ts` with core types
- [ ] Create `helpers.ts` with registration functions
- [ ] Create `tools/` directory
- [ ] Move each tool to its own file
- [ ] Update tool files to use `createTool`
- [ ] Create `tools/index.ts` with all exports
- [ ] Update server to use auto-registration
- [ ] Run tests to verify functionality
- [ ] Update type exports if needed for external consumers

## Benefits

1. **Type Safety:** Full TypeScript inference for tool parameters
2. **Organization:** One file per tool for easier navigation
3. **Testability:** Tools can be tested independently
4. **Reusability:** Tools can be imported and used in other contexts
5. **Maintainability:** Clear separation of concerns
6. **Scalability:** Easy to add new tools following the pattern

## Common Issues & Solutions

### Issue: Types showing as `unknown`

**Solution:** Always use `createTool()` helper instead of creating tool objects directly. TypeScript will infer the types from the schema.

### Issue: `env.client` is undefined

**Solution:** Ensure you're passing the correct client when calling `createToolEnvironment` in your registration function.

### Issue: `env.sendStatus` is not a function

**Solution:** This should never happen since `sendStatus` is now required in `ToolEnvironment`. If you see this error, ensure you're using the updated `createToolEnvironment` helper that always provides `sendStatus`.

### Issue: Tests failing after refactoring

**Solution:** Ensure tests are importing from the new tool files and that the environment is properly mocked in test setup. You'll need to mock the `sendStatus` function since it's now required.

### Issue: Tools not being registered

**Solution:** Verify that:
1. Tools are exported in `tools/index.ts`
2. The import statement uses `.js` extension: `import * as tools from './tools/index.js'`
3. Tool names match the export names (snake_case)