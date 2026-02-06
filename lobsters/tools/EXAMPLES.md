# Example prompts:

## MCP Server Mode (for AI assistants)

```
acquire a planet in a radius of 10 from 0,0
```

```
find an active planet to attack, then pick one of your planets and send a fleet to attack the first planet. Finally wait and resolve the fleet.
```

## CLI Mode (direct command execution)

### Basic Usage

Show help:

```bash
conquest --help
```

### Global Options

| Option                      | Environment Variable | Description                      | Default                  |
| --------------------------- | -------------------- | -------------------------------- | ------------------------ |
| `--rpc-url <url>`           | `RPC_URL`            | RPC URL for the Ethereum network | (required)               |
| `--game-contract <address>` | `GAME_CONTRACT`      | Game contract address            | (required)               |
| `--storage <type>`          | `STORAGE_TYPE`       | Storage backend: json or sqlite  | json                     |
| `--storage-path <path>`     | `STORAGE_PATH`       | Storage directory path           | ./data                   |
| `--private-key <key>`       | `PRIVATE_KEY`        | Private key for transactions     | (required for write ops) |

### Using Environment Variables

Set up your environment:

```bash
export RPC_URL=https://rpc.gnosischain.com
export GAME_CONTRACT=0x322813fd9a801c5507c9de605d63cea4f2ce6c44
export PRIVATE_KEY=0x...
export STORAGE_TYPE=json
export STORAGE_PATH=./data
export ETHEREUM_TOOLS=true  # Only for MCP server mode
```

Then run commands without repeating options:

```bash
conquest get-my-planets --radius 10
```

### Available Commands

#### Get My Planets

Get all planets owned by the current user address:

```bash
conquest get_my_planets --radius 10
```

#### Get Planets Around

Find planets near a specific location:

```bash
conquest get_planets_around --center-x 0 --center-y 0 --radius 20
```

#### Acquire Planets

Stake multiple planets:

```bash
# Using planet IDs as numbers
conquest acquire_planets --planet-ids 1,2,3,4,5

# Using planet IDs as hex strings
conquest acquire_planets --planet-ids 0x1,0x2,0x3

# With custom amounts
conquest acquire_planets --planet-ids 1,2,3 --amount-to-mint 1000000 --token-amount 500
```

#### Send Fleet

Send spaceships from one planet to another:

```bash
conquest send_fleet \
  --from 10,20 \
  --to 15,25 \
  --quantity 100

# With optional parameters
conquest send_fleet \
  --from 10,20 \
  --to 15,25 \
  --quantity 100 \
  --arrivalTimeWanted 1735123456 \
  --gift
```

#### Resolve Fleet

Resolve a committed fleet (after arrival time + resolve window):

```bash
conquest resolve_fleet --fleet-id "your-fleet-id"
```

#### Exit Planets

Start the exit (unstake) process for planets:

```bash
conquest exit_planets --planet-ids 1,2,3,4,5
```

#### Get Pending Exits

Check planets that are currently exiting:

```bash
conquest get_pending_exits
```

#### Verify Exit Status

Check the status of a specific planet's exit:

```bash
conquest verify_exit_status --planet-id 1
```

#### Get Pending Fleets

Check fleets that are currently traveling:

```bash
conquest get_pending_fleets
```

### MCP Server Mode

Start the MCP server for AI assistant integration:

```bash
conquest mcp --rpc-url https://rpc.gnosischain.com --game-contract 0x322813fd9a801c5507c9de605d63cea4f2ce6c44
```

With additional options:

```bash
conquest mcp \
  --rpc-url https://rpc.gnosischain.com \
  --game-contract 0x322813fd9a801c5507c9de605d63cea4f2ce6c44 \
  --ethereum \
  --storage json \
  --storage-path ./data
```

### Workflow Examples

#### Example 1: Complete Game Loop

```bash
# 1. Find your planets
conquest get_my_planets --radius 50

# 2. Find targets near one of your planets
conquest get_planets_around --center-x 10 --center-y 20 --radius 15

# 3. Send a fleet to attack
conquest send_fleet --from 10,20 --to 12,22 --quantity 100

# 4. Wait for fleet to arrive, then resolve
conquest resolve_fleet --fleet-id "your-fleet-id"

# 5. Check your new planets
conquest get_my_planets --radius 50
```

#### Example 2: Expand Territory

```bash
# Find unclaimed planets
conquest get_planets_around --center-x 0 --center-y 0 --radius 30

# Acquire multiple planets
conquest acquire_planets --planet-ids 1,2,3,4,5,6,7,8,9,10
```

#### Example 3: Exit Planets

```bash
# Start exit process for multiple planets
conquest exit_planets --planet-ids 1,2,3

# Check pending exits
conquest get_pending_exits

# Verify exit status (after 7 days)
conquest verify_exit_status --planet-id 1
```

### Using with Other Tools

The CLI outputs JSON, making it easy to pipe to other tools:

```bash
# Filter planets with lots of spaceships
conquest get_my_planets --radius 10 | jq '.planets[] | select(.numSpaceships > 1000)'

# Count your total planets
conquest get_my_planets --radius 50 | jq '.planets | length'

# Get fleet IDs only
conquest get_pending_fleets | jq '.fleets[].fleetId'
```

### Common Issues

#### Private Key Format

Your private key must start with `0x`:

```bash
export PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
```

#### No Private Key Warning

If you don't set a private key, you can still use read-only commands but write operations will fail:

```bash
# These will work:
conquest get-my-planets --radius 10
conquest get-planets-around --center-x 0 --center-y 0 --radius 20

# These will fail without a private key:
conquest acquire-planets --planet-ids 1,2,3
conquest send-fleet --from 10,20 --to 15,25 --quantity 100
```

#### RPC URL

Make sure your RPC URL is accessible:

```bash
# Test your RPC URL
curl -X POST https://rpc.gnosischain.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Output Format

All commands return JSON output:

**Success Example:**

```json
{
	"planets": [
		{
			"planetId": "1",
			"location": {"id": "1", "x": 10, "y": 20},
			"numSpaceships": 500,
			"owner": "0x...",
			"active": true
		}
	]
}
```

**Error Example:**

```json
{
	"error": "No planet found at source coordinates (10, 20)",
	"stack": "Error: No planet found at source coordinates (10, 20)\n    at ..."
}
```
