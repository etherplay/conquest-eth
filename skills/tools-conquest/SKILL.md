---
name: tools-conquest
description: Interact with Conquest.eth blockchain strategy game using the conquest CLI. Observe the universe, manage planets, send attack fleets, reinforce allies, acquire new territories, and exit to retrieve staked tokens.
compatibility: Requires Node.js and npm. Network access needed for RPC calls to Gnosis Chain.
---

# tools-conquest CLI

Use `conquest` to interact with Conquest.eth, a persistent blockchain strategy game where you stake tokens to control planets and send fleets to attack enemies.

## Quick Start

```bash
# Option 1: Use npx (no install required)
npx -y @conquest-eth/tools get_my_planets --radius 25

# Option 2: Install globally
npm install -g @conquest-eth/tools # or use pnpm/volta/...
conquest --rpc-url http://localhost:8545 and --game-contract 0x322813fd9a801c5507c9de605d63cea4f2ce6c44 get_my_planets --radius 25
```

### Configuration

Instead of passing the config via cli, you can either provide the env via your shell:

```bash
# Set RPC endpoint and game contract (required for all commands)
export RPC_URL=https://rpc.gnosischain.com
export GAME_CONTRACT=0x322813fd9a801c5507c9de605d63cea4f2ce6c44

# For write operations, also set private key
export PRIVATE_KEY=0x...

# Query example
conquest get_my_planets --radius 25
```

Or by using .env / .env.local file that the CLI reads automatically.

All commands output JSON. Parse with `jq` or process programmatically.

---

## Commands Overview

| Command              | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `get_my_planets`     | List your owned planets within a radius      |
| `get_planets_around` | Find planets near specific coordinates       |
| `acquire_planets`    | Stake tokens to claim unclaimed planets      |
| `send_fleet`         | Send spaceships to attack or reinforce       |
| `resolve_fleet`      | Reveal fleet destination and trigger combat  |
| `exit_planets`       | Start exit process to retrieve staked tokens |
| `get_pending_exits`  | View planets currently in exit process       |
| `get_pending_fleets` | View fleets still traveling                  |
| `verify_exit_status` | Check if exit is complete and withdrawable   |

---

## Observing the Universe

### Get Your Planets

```bash
conquest get_my_planets --radius 25
# Output: { "planets": [{ "planetId": "123", "location": {"x": 10, "y": 20}, "numSpaceships": 5000, ... }] }
```

**Parameters:**

- `--radius` (number, max 50): Search radius around origin (0,0). Use 25 as default.

### Find Planets Around a Location

```bash
conquest --rpc-url http://localhost:8545 and --game-contract 0x322813fd9a801c5507c9de605d63cea4f2ce6c44 get_planets_around --center 10,20 --radius 25
# Returns planets with distances, owners, and stats
```

**Parameters:**

- `--center <x,y>` (coordinates): Center point in x,y format
- `--radius` (number, max 50): Search radius around the center

---

## Managing Planets

### Acquire Planets

Stake tokens to claim ownership of unclaimed planets:

```bash
# Acquire a single planet using comma-separated coordinates
conquest acquire_planets --coordinates "10,20"

# Acquire multiple planets using comma-separated coordinates
# Format: x1,y1,x2,y2,x3,y3,... (pairs of x,y values)
conquest acquire_planets --coordinates "10,20 15,25 20,30"

# With custom amounts
conquest acquire_planets --coordinates "10,20" --amount-to-mint 1000000 --token-amount 500
```

**Parameters:**

- `--coordinates` (string): Comma-separated coordinates. Single planet: `"x,y"`. Multiple planets: `"x1,y1 x2,y2 x3,y3 ..."`
- `--amount-to-mint` (optional): Amount of native token to spend
- `--token-amount` (optional): Amount of staking token to spend

**Notes:**

- Tokens deposited are not spent - they remain on the planet until you exit
- Exiting takes time (~3 days), during which your stake is vulnerable
- Fighting natives: 10,000 attack power against 100,000 spaceship fleet

### Exit Planets

Start exit process to retrieve staked tokens:

```bash
# Exit a single planet
conquest exit_planets --coordinates "10,20"

# Exit multiple planets
# Format: x1,y1 x2,y2 x3,y3 ... (pairs of x,y values)
conquest exit_planets --coordinates "10,20 15,25"
```

**Parameters:**

- `--coordinates` (string): Comma-separated coordinates. Single planet: `"x,y"`. Multiple planets: `"x1,y1 x2,y2 x3,y3 ..."`

**Notes:**

- Exit takes ~3 days
- During exit, stake is vulnerable to attacks
- Call `verify_exit_status` after exit duration to complete withdrawal

---

## Fleet Operations

### Send Fleet

Send spaceships from one planet to another:

```bash
# Basic attack fleet
conquest send_fleet --from 10,20 --to 15,25 --quantity 100

# With specific arrival time (timestamp in seconds)
conquest send_fleet --from 10,20 --to 15,25 --quantity 100 --arrivalTimeWanted 1735123456

# Send as gift (non-combat transfer)
conquest send_fleet --from 10,20 --to 15,25 --quantity 100 --gift
```

**Parameters:**

- `--from <coords>` (string): Source planet coordinates in `x,y` format
- `--to <coords>` (string): Destination planet coordinates in `x,y` format
- `--quantity` (number): Number of spaceships to send
- `--arrivalTimeWanted` (optional): Desired arrival timestamp
- `--gift` (optional): Send as gift without combat
- `--specific` (optional): Additional fleet data

**Returns:** Fleet ID, source/destination, quantity, arrival time, and secret.

**Notes:**

- Two-step process: send then resolve
- While traveling, only you know the destination
- Gifts to non-allies: 20% burn tax (80% arrive)
- Fleets inherit attack/speed stats from origin planet

### Resolve Fleet

Reveal destination and trigger combat after arrival:

```bash
conquest resolve_fleet --fleet-id "your-fleet-id"
```

**Parameters:**

- `--fleet-id` (string): Fleet ID to resolve

**Notes:**

- Must call after arrival time + resolve window
- Resolve within ~12 hours or fleet is lost
- Combat occurs immediately upon resolution

---

## Monitoring Status

### Check Pending Fleets

```bash
conquest get_pending_fleets
# Returns: fleet IDs, source/destination, quantities, arrival times
```

### Check Pending Exits

```bash
conquest get_pending_exits
# Returns: planet IDs, start times, durations, completion times
```

### Verify Exit Status

```bash
conquest verify_exit_status --x 10 --y 20
# Returns: exit completion status
```

**Note:** The `verify_exit_status` command uses separate `--x` and `--y` parameters rather than a combined coordinates string.

---

## Gameplay Fundamentals

### Planet Statistics

Each planet has immutable stats:

- **Capacity**: Max spaceships before production stops
- **Natives**: Local population to fight when claiming
- **Stake**: Token deposit for spaceship production
- **Production**: Spaceships produced per hour
- **Attack**: Attack power for outgoing fleets
- **Defense**: Defense power against incoming fleets
- **Speed**: Speed multiplier for outgoing fleets
- **Upkeep**: Increases when sending fleets, reduces production by 50%

### Combat Formula

```
attackFactor = numAttack * ((1000000 - sizeFactor*1000000) + (sizeFactor*1000000 * numAttack / numDefense))
attackDamage = (attackFactor * attack) / defense / 1000000
```

- If `attackDamage < numDefense`: Attack fails, attackers destroyed
- If `attackDamage >= numDefense`: Attack succeeds, planet captured

---

## Common Patterns

### Explore and Expand

```bash
# Find your planets
conquest get_my_planets --radius 50

# Find unclaimed planets nearby
conquest get_planets_around --center 10,20 --radius 15 | jq '.planets[] | select(.owner == "0x0000000000000000000000000000000000000000")'

# Acquire new territory
conquest acquire_planets --coordinates "12,22 18,28"
```

### Attack and Capture

```bash
# Find targets near your strong planet
conquest get_planets_around --center 50,50 --radius 20

# Send attack fleet
conquest send_fleet --from 50,50 --to 55,55 --quantity 1000

# Monitor fleet
conquest get_pending_fleets

# Resolve after arrival
conquest resolve_fleet --fleet-id "your-fleet-id"
```

### Exit and Withdraw

```bash
# Start exit
conquest exit_planets --coordinates 10,20

# Check progress
conquest get_pending_exits

# Verify completion (after 3 days)
conquest verify_exit_status --x 10 --y 20
```

---

## Using with jq

```bash
# Filter planets with lots of spaceships
conquest get_my_planets --radius 25 | jq '.planets[] | select(.numSpaceships > 1000)'

# Count total planets
conquest get_my_planets --radius 50 | jq '.planets | length'

# Get fleet IDs only
conquest get_pending_fleets | jq '.fleets[].fleetId'

# Find unowned planets
conquest get_planets_around --center 0,0 --radius 30 | jq '.planets[] | select(.owner == "0x0000000000000000000000000000000000000000")'
```

---

## Environment Variables

| Variable        | Description                                    |
| --------------- | ---------------------------------------------- |
| `RPC_URL`       | RPC endpoint (default: Gnosis Chain)           |
| `GAME_CONTRACT` | Conquest.eth game contract address             |
| `PRIVATE_KEY`   | Private key for write operations (0x-prefixed) |

---

## Error Handling

All commands return JSON. Errors include an `error` field:

```json
{"error": "Transaction not found", "stack": "..."}
```

Exit codes: `0` = success, `1` = error.

---

## Common Issues

### Private Key Format

Must start with `0x`:

```bash
export PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
```

### Read-Only vs Write Operations

Without private key, only read commands work:

```bash
# Works without PRIVATE_KEY:
conquest get_my_planets --radius 10
conquest get_planets_around --center 0,0 --radius 20

# Requires PRIVATE_KEY:
conquest acquire_planets --coordinates "10,20"
conquest send_fleet --from 10,20 --to 15,25 --quantity 100
```

### Test RPC Connection

```bash
curl -X POST https://rpc.gnosischain.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Tips

- Use radius of 25 for good performance (max 50)
- Fleet operations are two-step: send then resolve
- Resolve fleets within ~12 hours of arrival
- Monitor pending exits to know when withdrawals are ready
- Planets over capacity can send fleets without losing production
- **Coordinate formats**: Multiple coordinate tuples can be separated by space or comma:
  - `"2,5 -3,4"` (space-separated tuples)
  - `"2,5,-3,4"` (all commas)
  - `"2,5, -3,4"` (mixed - comma followed by space)
- **Negative coordinates**: Use quotes to ensure negative numbers are parsed correctly: `"-10,20 -5,15"`
