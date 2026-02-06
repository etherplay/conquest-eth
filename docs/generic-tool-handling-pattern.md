# Generic Tool Handling Pattern

This document describes a pattern for creating a reusable tool-handling library that can work with any domain-specific environment types. The pattern uses TypeScript generics to decouple the tool infrastructure from application-specific code.

## Overview

The goal is to create a tool-handling module that:
1. Provides generic types and functions for defining and executing tools
2. Can be used with any custom environment (managers, services, clients)
3. Supports both MCP server registration and CLI execution
4. Has no dependencies on application-specific types

## Core Types

### 1. ToolEnvironment<TEnv>

A generic environment type that gets passed to tool execute functions:

```typescript
/**
 * Environment provided to tool execute functions
 * @template TEnv - Additional environment properties spread into the environment
 */
export type ToolEnvironment<TEnv extends Record<string, any> = Record<string, any>> = {
    /** function to send status updates during tool execution */
    sendStatus: (message: string) => Promise<void>;
} & TEnv;
```

### 2. ToolResult

Standard result type for tool execution:

```typescript
export type ToolResult =
    | {success: true; result: Record<string, any>}
    | {success: false; error: string; stack?: string};
```

### 3. ToolSchema

Types that can be used for tool input parameters:

```typescript
export type ToolSchema =
    | z.ZodObject<any>
    | z.ZodUnion<readonly [z.ZodObject<any>, ...z.ZodObject<any>[]]>;
```

### 4. Tool<S, TEnv>

Generic tool definition type:

```typescript
export type Tool<
    S extends ToolSchema = z.ZodObject<any>,
    TEnv extends Record<string, any> = Record<string, any>,
> = {
    description: string;
    schema: S;
    execute: (env: ToolEnvironment<TEnv>, params: z.infer<S>) => Promise<ToolResult>;
};
```

### 5. createTool<S, TEnv>

Helper function for creating tools with type inference:

```typescript
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
```

## MCP Server Registration

### createToolEnvironment<TEnv>

Creates the tool environment by merging sendStatus with custom env properties:

```typescript
export function createToolEnvironment<TEnv extends Record<string, any>>(
    server: McpServer,
    env: TEnv,
): ToolEnvironment<TEnv> {
    return {
        sendStatus: async (_message: string) => {
            // Implement progress notifications
        },
        ...env,
    };
}
```

### registerTool<TEnv>

Registers a tool with the MCP server:

```typescript
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
```

## CLI Tool Generation

### CliConfig<TEnv>

Configuration for CLI tool generation:

```typescript
export interface CliConfig<TEnv extends Record<string, any>> {
    /**
     * Factory function that creates environment from parsed CLI options
     * @param cliOptions - Parsed CLI options as Record<string, any>
     * @returns Environment properties (can be async)
     */
    envFactory: (cliOptions: Record<string, any>) => Promise<TEnv> | TEnv;
}
```

### generateToolCommand<TEnv>

Generates a CLI command for a single tool:

```typescript
export function generateToolCommand<TEnv extends Record<string, any>>(
    program: Command,
    toolName: string,
    tool: Tool<z.ZodObject<any>, TEnv>,
    cliConfig: CliConfig<TEnv>,
): void;
```

### registerAllToolCommands<TEnv>

Registers all tools as CLI commands:

```typescript
export function registerAllToolCommands<TEnv extends Record<string, any>>(
    program: Command,
    tools: Record<string, Tool<any, TEnv>>,
    cliConfig: CliConfig<TEnv>,
): void;
```

## Application Usage Example

### Step 1: Define Your Environment Type

```typescript
// types.ts
import type {MyManager1} from './manager1.js';
import type {MyManager2} from './manager2.js';

export interface MyAppEnv {
    manager1: MyManager1;
    manager2: MyManager2;
}
```

### Step 2: Create Tool Definitions

```typescript
// tools/my_tool.ts
import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {MyAppEnv} from '../types.js';

const schema = z.object({
    param1: z.string().describe('First parameter'),
    param2: z.number().optional().describe('Optional second parameter'),
});

export const my_tool = createTool<typeof schema, MyAppEnv>({
    description: 'Description of what this tool does',
    schema,
    execute: async (env, {param1, param2}) => {
        try {
            // Access your managers through env
            const result = await env.manager1.doSomething(param1);
            
            return {
                success: true,
                result: {data: result},
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
});
```

### Step 3: Set Up MCP Server

```typescript
// index.ts
import * as tools from './tools/index.js';
import {registerTool} from './tool-handling/index.js';
import type {MyAppEnv} from './types.js';

export function createServer(config: Config) {
    const server = new McpServer({...});
    
    // Initialize your managers
    const manager1 = new MyManager1(config);
    const manager2 = new MyManager2(config);
    
    const env: MyAppEnv = {manager1, manager2};
    
    // Register all tools
    for (const [name, tool] of Object.entries(tools)) {
        if (name === 'default') continue;
        registerTool({server, name, tool, env});
    }
    
    return server;
}
```

### Step 4: Set Up CLI

```typescript
// cli.ts
import {Command} from 'commander';
import * as tools from './tools/index.js';
import {registerAllToolCommands, type CliConfig} from './tool-handling/cli-tool-generator.js';
import type {MyAppEnv} from './types.js';

const program = new Command();

// Define global CLI options
program
    .option('--api-key <key>', 'API key')
    .option('--endpoint <url>', 'Service endpoint');

// Create envFactory that initializes managers from CLI options
const envFactory: CliConfig<MyAppEnv>['envFactory'] = async (cliOptions) => {
    const apiKey = cliOptions.apiKey || process.env.API_KEY;
    const endpoint = cliOptions.endpoint || process.env.ENDPOINT;
    
    if (!apiKey) throw new Error('API key is required');
    
    // Initialize managers
    const manager1 = new MyManager1({apiKey, endpoint});
    const manager2 = new MyManager2({apiKey, endpoint});
    
    return {manager1, manager2};
};

// Register all tool commands
registerAllToolCommands(program, tools, {envFactory});

program.parse(process.argv);
```

## Key Principles

1. **No Application-Specific Types in tool-handling**: The tool-handling module should only use generic types (`TEnv extends Record<string, any>`)

2. **Environment is Spread**: The custom environment properties are spread directly into `ToolEnvironment`, so tools access `env.manager1` not `env.managers.manager1`

3. **envFactory Receives CLI Options**: The `envFactory` receives parsed CLI options as `Record<string, any>` and creates the environment. The factory can cast to a specific type internally.

4. **Async envFactory**: The `envFactory` can be async to support initialization that requires async operations (like fetching config)

5. **Schema Defined Separately**: For type inference to work, define the Zod schema as a separate `const` before using it in `createTool<typeof schema, MyEnv>`

## File Structure

```
src/
├── tool-handling/          # Generic library code (can be extracted)
│   ├── types.ts           # ToolEnvironment, Tool, createTool, etc.
│   ├── index.ts           # createToolEnvironment, registerTool
│   └── cli-tool-generator.ts  # CliConfig, generateToolCommand, registerAllToolCommands
├── tools/                  # Application-specific tools
│   ├── index.ts           # Re-exports all tools
│   ├── my_tool.ts
│   └── another_tool.ts
├── types.ts               # Application types including MyAppEnv
├── index.ts               # MCP server entry point
└── cli.ts                 # CLI entry point
```

## Migration Steps

If you have an existing tool-handling module with concrete types:

1. Replace concrete type imports with generic type parameters
2. Add `TEnv extends Record<string, any>` to all types and functions
3. Replace individual manager parameters with a single `env: TEnv` object
4. Update `CliConfig` to use `envFactory` instead of concrete config properties
5. Define your application's environment interface (e.g., `MyAppEnv`)
6. Update all tool definitions to use `createTool<typeof schema, MyAppEnv>`
7. Update MCP server initialization to create and pass the env object
8. Update CLI to provide an `envFactory` function
