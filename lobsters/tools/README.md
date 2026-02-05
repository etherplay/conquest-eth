# MCP for Conquest.eth v0

A dual-mode CLI tool for interacting with the Conquest.eth blockchain game. It can run as an **MCP server** for AI assistant integration or execute **tools directly** from the command line.

## Features

- **MCP Server Mode**: Integrate with AI assistants via the Model Context Protocol
- **CLI Mode**: Execute game commands directly from your terminal
- **Dynamic Command Generation**: CLI commands are auto-generated from tool definitions
- **Comprehensive Game Tools**: Acquire planets, send fleets, resolve fleets, manage exits, and more

## Installation

```bash
pnpm install
pnpm build
```

## Usage

### CLI Mode (Direct Command Execution)

Show help and available commands:

```bash
node dist/cli.js --help
```

#### Global Options

| Option                      | Environment Variable | Description                      | Default                  |
| --------------------------- | -------------------- | -------------------------------- | ------------------------ |
| `--rpc-url <url>`           | `RPC_URL`            | RPC URL for the Ethereum network | (required)               |
| `--game-contract <address>` | `GAME_CONTRACT`      | Game contract address            | (required)               |
| `--storage <type>`          | `STORAGE_TYPE`       | Storage backend: json or sqlite  | json                     |
| `--storage-path <path>`     | `STORAGE_PATH`       | Storage directory path           | ./data                   |
| `--private-key <key>`       | `PRIVATE_KEY`        | Private key for transactions     | (required for write ops) |

#### MCP Server Options

| Option       | Environment Variable | Description                  | Default |
| ------------ | -------------------- | ---------------------------- | ------- |
| `--ethereum` | `ETHEREUM_TOOLS`     | Include tools-ethereum tools | false   |

#### Using Environment Variables

Set up your environment:

```bash
export RPC_URL=https://rpc.gnosischain.com
export GAME_CONTRACT=0x322813fd9a801c5507c9de605d63cea4f2ce6c44
export PRIVATE_KEY=0x...
```

Then run commands without repeating options:

```bash
node dist/cli.js get_my_planets --radius 10
```

#### Available Commands

| Command              | Description                             |
| -------------------- | --------------------------------------- |
| `acquire_planets`    | Acquire/stake multiple planets          |
| `send_fleet`         | Send a fleet from one planet to another |
| `resolve_fleet`      | Resolve a committed fleet               |
| `exit_planets`       | Start the exit process for planets      |
| `get_my_planets`     | Get all planets owned by you            |
| `get_planets_around` | Get planets near a location             |
| `get_pending_exits`  | Get pending exit operations             |
| `get_pending_fleets` | Get pending fleets                      |
| `verify_exit_status` | Check a planet's exit status            |

#### Examples

```bash
# Get your planets
node dist/cli.js get_my_planets --radius 10

# Find planets near a location
node dist/cli.js get_planets_around --center-x 0 --center-y 0 --radius 20

# Acquire planets
node dist/cli.js acquire_planets --planet-ids 1,2,3,4,5

# Send a fleet
node dist/cli.js send_fleet --from-x 10 --from-y 20 --to-x 15 --to-y 25 --quantity 100

# Resolve a fleet
node dist/cli.js resolve_fleet --fleet-id "your-fleet-id"

# Exit planets
node dist/cli.js exit_planets --planet-ids 1,2,3
```

See [`EXAMPLES.md`](./EXAMPLES.md) for more detailed usage examples.

### MCP Server Mode

Start the MCP server for AI assistant integration:

```bash
node dist/cli.js mcp --rpc-url https://rpc.gnosischain.com --game-contract 0x322813fd9a801c5507c9de605d63cea4f2ce6c44
```

Or use the MCP Inspector for testing:

```bash
pnpm mcp:inspector node dist/cli.js --game-contract 0xD833d4dBBb0C19aF1EEf76540d66E2076a5e9D72 --rpc-url https://rpc.gnosis.gateway.fm
```

For Conquest 2025-1 edition, use:

```bash
pnpm mcp:inspector node dist/cli.js --game-contract 0xD833d4dBBb0C19aF1EEf76540d66E2076a5e9D72 --rpc-url https://rpc.gnosis.gateway.fm
```

## Architecture

The CLI follows a dual-mode architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLI Tool                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Root Program │  │ MCP Command  │  │  Dynamic Tool Cmds   │  │
│  │ --global-opt │  │  mcp server  │  │ (generated per tool) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                 │                     │               │
│         ▼                 ▼                     ▼               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  Tool Definitions                       │   │
│   │  - description  - Zod schema  - execute(env, params)    │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Tool Development

Tools are defined with a standardized pattern:

```typescript
import {z} from 'zod';
import {createTool} from '../types.js';

export const example_tool = createTool({
	description: 'Description of what this tool does',
	schema: z.object({
		param1: z.string().describe('First parameter'),
		param2: z.number().optional().describe('Optional parameter'),
	}),
	execute: async (env, {param1, param2}) => {
		// Access fleetManager and planetManager via env
		const result = await env.planetManager.getMyPlanets(10);

		return {
			success: true,
			result: {
				message: `Processed ${param1}`,
				data: result,
			},
		};
	},
});
```

## Output Format

All CLI commands return JSON output:

**Success:**

```json
{
	"planets": [
		{
			"planetId": "1",
			"location": {"id": "1", "x": 10, "y": 20},
			"numSpaceships": 500
		}
	]
}
```

**Error:**

```json
{
	"error": "No planet found at coordinates",
	"stack": "Error: No planet found at coordinates\n    at ..."
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch for changes and rebuild
pnpm dev

# Run tests
pnpm test

# Format code
pnpm format

# Start the MCP server with auto-reload
pnpm start
```

## Project Structure

```
lobsters/mcp/src/
├── cli.ts                    # CLI entry point (dual-mode)
├── cli-tool-generator.ts     # Dynamic CLI command generation
├── index.ts                  # MCP server setup
├── types.ts                  # Type definitions
├── helpers/
│   └── index.ts              # Helper functions
├── tools/
│   ├── index.ts              # Tool exports
│   ├── acquire_planets.ts    # Tool implementations
│   ├── send_fleet.ts
│   ├── resolve_fleet.ts
│   └── ...
├── fleet/
│   ├── manager.ts            # Fleet operations manager
│   ├── send.ts
│   └── resolve.ts
├── planet/
│   ├── manager.ts            # Planet operations manager
│   ├── acquire.ts
│   └── exit.ts
└── storage/
    ├── interface.ts          # Storage interface
    └── json-storage.ts       # JSON storage implementation
```

## License

MIT

## Contributing

Contributions are welcome! Please read the project documentation and open issues for discussion.

## Related Documentation

- [`EXAMPLES.md`](./EXAMPLES.md) - Detailed usage examples
- [`../../plans/cli-implementation-plan.md`](../../plans/cli-implementation-plan.md) - Implementation plan
- [`../../plans/cli-refactoring-guide.md`](../../plans/cli-refactoring-guide.md) - Refactoring guide
