# Conquest.eth CLI

A command-line tool for interacting with the Conquest.eth blockchain game. Execute game commands directly from your terminal to acquire planets, send fleets, resolve battles, and manage your empire.

## Features

- **CLI Mode**: Execute game commands directly from your terminal
- **Comprehensive Game Tools**: Acquire planets, send fleets, resolve fleets, manage exits, and more
- **Dynamic Command Generation**: CLI commands are auto-generated from tool definitions
- **MCP Server Mode**: the cli provide an mcp command if you prefers to integrate your agent via Model Context Protocol

## Installation

```bash
npm i -g @conquest-eth/tools
```

## Usage

Show help and available commands:

```bash
ecli --help
```

### Global Options

| Option                      | Environment Variable | Description                      | Default    |
| --------------------------- | -------------------- | -------------------------------- | ---------- |
| `--rpc-url <url>`           | `RPC_URL`            | RPC URL for the Ethereum network | (required) |
| `--game-contract <address>` | `GAME_CONTRACT`      | Game contract address            | (required) |
| `--storage <type>`          | `STORAGE_TYPE`       | Storage backend: json or sqlite  | json       |
| `--storage-path <path>`     | `STORAGE_PATH`       | Storage directory path           | ./data     |

### Using Environment Variables

Set up your environment:

```bash
export RPC_URL=https://rpc.gnosischain.com
export GAME_CONTRACT=0x322813fd9a801c5507c9de605d63cea4f2ce6c44
export PRIVATE_KEY=0x...
```

Then run commands without repeating options:

```bash
ecli get_my_planets --radius 10
```

### Available Commands

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

### Examples

```bash
# Get your planets
ecli get_my_planets --radius 10

# Find planets near a location
ecli get_planets_around --center-x 0 --center-y 0 --radius 20

# Acquire planets
ecli acquire_planets --planet-ids 1,2,3,4,5

# Send a fleet (coordinates use x,y format)
ecli send_fleet --from 10,20 --to 15,25 --quantity 100

# Resolve a fleet
ecli resolve_fleet --fleet-id "your-fleet-id"

# Exit planets
ecli exit_planets --planet-ids 1,2,3
```

See [`EXAMPLES.md`](./EXAMPLES.md) for more detailed usage examples.

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
import {createTool} from '../tool-handling/types.js';

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

## MCP Server Mode (Alternative)

As an alternative to direct CLI usage, `ecli` can also run as an MCP (Model Context Protocol) server for.

Start the MCP server:

```bash
ecli --rpc-url https://rpc.gnosischain.com --game-contract 0x322813fd9a801c5507c9de605d63cea4f2ce6c44 mcp
```

MCP-specific options:

| Option       | Environment Variable | Description                  | Default |
| ------------ | -------------------- | ---------------------------- | ------- |
| `--ethereum` | `ETHEREUM_TOOLS`     | Include tools-ethereum tools | false   |

For testing with the MCP Inspector:

```bash
pnpm mcp:inspector ecli --game-contract 0xD833d4dBBb0C19aF1EEf76540d66E2076a5e9D72 --rpc-url https://rpc.gnosis.gateway.fm mcp
```

## License

MIT

## Contributing

Contributions are welcome! Please read the project documentation and open issues for discussion.

## Related Documentation

- [`EXAMPLES.md`](./EXAMPLES.md) - Detailed usage examples
- [`../../plans/cli-implementation-plan.md`](../../plans/cli-implementation-plan.md) - Implementation plan
- [`../../plans/cli-refactoring-guide.md`](../../plans/cli-refactoring-guide.md) - Refactoring guide
