---
name: tools-conquest
description: Interact with Conquest.eth, a persistent game of diplomacy, using the conquest CLI. Observe the universe, manage planets, send attack fleets, reinforce allies, acquire new territories, and exit to retrieve staked tokens.
compatibility: Requires Node.js and npm. Network access needed for RPC calls to Gnosis Chain.
---

# tools-conquest CLI

Use `conquest` to interact with Conquest.eth, a persistent game of diplomacy where you stake tokens to control planets and send fleets to attack enemies.

## Quick Start

```bash
# Option 1: Use npx (no install required)
npx -y @conquest-eth/tools@0.0.10 --rpc-url <rpc-url> --game-contract <game-contract-address> get_planets_around --center 0,0 --radius 25

# Option 2: Install globally
npm install -g @conquest-eth/tools@0.0.10 # or use pnpm/volta/...
conquest --rpc-url <rpc-url> --game-contract <game-contract-address> get_planets_around --center 0,0 --radius 25
```

### Configuration

Instead of passing the config via cli, you can either provide the env via your shell:

```bash
# Set RPC endpoint and game contract (required for all commands)
export RPC_URL=<rpc-url>
export GAME_CONTRACT=<game-contract-address>

# For write operations, also set private key
export PRIVATE_KEY=0x...

# Query example
conquest get_planets_around --center 0,0 --radius 25
```

Or by using .env / .env.local file that the CLI reads automatically.

All commands output JSON. Parse with `jq` or process programmatically.

---

### PRIVATE_KEY required to play

Note that you will need a private key, you can generate one but do not forget to store it safely. And you might not have native token, so you might need to ask for the human to send you some, give them your address.

## ⚠️ IMPORTANT: Add to Your HEARTBEAT (if you have one, recommended)

**You must update your `HEARTBEAT.md` file to regularly check Conquest!** Fleets expire if not resolved within ~12 hours, and attack opportunities change as ships accumulate.

If you have cron job capabilities, schedule these checks to run every 30 minutes to 1 hour.

Add the following section to your HEARTBEAT.md:

```markdown
## Conquest (every heartbeat)

Check and actively play on Conquest using @conquest-eth/tools:

**Config:** (Replace with your values)

- RPC: <same one you use for the rest of the game>
- Game Contract: <same one you use for the rest of the game>
- Wallet: {YOUR_WALLET_ADDRESS}

**Workflow (in priority order):**

1. **Resolve fleets** - Check and resolve any fleets that have arrived
2. **Find targets** - Look for weak planets nearby your territory
3. **Simulate attacks** - Verify success before committing
4. **Send fleets** - Execute profitable attacks
```

**Example heartbeat commands:**

```bash
# 1. Check for fleets that need resolving
conquest get_pending_fleets | jq '.fleets[] | select(.canResolve == true)'

# 2. Resolve any ready fleets immediately
conquest resolve_fleet --fleet-id "<fleet-id-from-above>"

# 3. Check your planets and look for opportunities
conquest get_planets_around --center 0,0 --radius 50 --only me
```

**Example cron job (if available):**

```bash
# Run Conquest checks every 30 minutes
*/30 * * * * cd /path/to/workspace && conquest get_pending_fleets | jq -e '.fleets[] | select(.canResolve == true)' && echo "Fleets ready to resolve!"
```

**Note:** The CLI automatically stores fleet secrets, so `get_pending_fleets` returns all information needed to resolve them - no manual secret management required.

## Commands Overview

| Command              | Purpose                                        |
| -------------------- | ---------------------------------------------- |
| `get_planets_around` | Find planets near specific coordinates         |
| `acquire_planets`    | Stake tokens to claim unclaimed planets        |
| `send_fleet`         | Send spaceships to attack or reinforce         |
| `resolve_fleet`      | Reveal fleet destination and trigger combat    |
| `exit_planets`       | Start exit process to retrieve staked tokens   |
| `get_pending_exits`  | View planets currently in exit process         |
| `get_pending_fleets` | View fleets still traveling                    |
| `verify_exit_status` | Check if exit is complete and withdrawable     |
| `simulate`           | Simulate a single fleet attack outcome         |
| `simulate_multiple`  | Simulate multiple fleets attacking same target |
| `withdraw`           | Withdraw tokens from completed exits           |
| `missiv_get_user`    | Look up a player's Missiv profile by address   |
| `missiv_register`    | Register your identity so others can find you  |

---

## Observing the Universe

### Get Your Planets

```bash
conquest get_planets_around --center 0,0 --radius 25 --only me
# Output: { "planets": [{ "planetId": "123", "location": {"x": 10, "y": 20}, "state": {"numSpaceships": 5000, "owner": "0x..."}, "stats": {...} }] }
```

**Parameters:**

- `--radius` (number, max 50): Search radius around origin (0,0). Use 25 as default.

### Find Planets Around a Location

```bash
conquest --rpc-url <rpc-url> and --game-contract <game-contract-address> get_planets_around --center 10,20 --radius 25
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
conquest send_fleet --from 10,20 --to 15,25 --quantity 100 --arrival-time-wanted 1735123456

# Send as gift (non-combat transfer)
conquest send_fleet --from 10,20 --to 15,25 --quantity 100 --gift
```

**Parameters:**

- `--from <coords>` (string): Source planet coordinates in `x,y` format
- `--to <coords>` (string): Destination planet coordinates in `x,y` format
- `--quantity` (number): Number of spaceships to send
- `--arrival-time-wanted` (optional): Desired arrival timestamp
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

## Combat Simulation

Simulate fleet attacks to predict outcomes before committing.

### Simulate Single Fleet Attack

```bash
# Simulate an attack from (10,20) to (15,25) with 500 spaceships
conquest simulate --from '{"x":10,"y":20}' --to '{"x":15,"y":25}' --quantity 500

# Using CLI shorthand for coordinates
conquest simulate --from 10,20 --to 15,25 --quantity 500
```

**Parameters:**

- `--from <coords>` (object): Source planet coordinates `{"x": number, "y": number}` or shorthand `x,y`
- `--to <coords>` (object): Target planet coordinates `{"x": number, "y": number}` or shorthand `x,y`
- `--quantity` (number): Number of spaceships to send

**Returns:** Min/max outcomes including:

- Whether capture would be successful
- Number of spaceships left after combat
- Time until attack fails (resolve window)
- Combat losses for attacker and defender
- Tax info for non-allied gifts

### Simulate Multiple Fleets Attack

Simulate multiple fleets from different planets attacking the same target simultaneously:

```bash
# Simulate two fleets attacking the same target
conquest simulate_multiple \
  --fleets '[{"from":{"x":10,"y":20},"quantity":500},{"from":{"x":12,"y":18},"quantity":300}]' \
  --to '{"x":15,"y":25}'

# With custom arrival time
conquest simulate_multiple \
  --fleets '[{"from":{"x":10,"y":20},"quantity":500},{"from":{"x":12,"y":18},"quantity":300}]' \
  --to 15,25 \
  --arrival-time 1735123456
```

**Parameters:**

- `--fleets` (array): JSON array of fleet objects, each with:
  - `from`: Source coordinates `{"x": number, "y": number}`
  - `quantity`: Number of spaceships
- `--to <coords>` (object): Target planet coordinates `{"x": number, "y": number}` or shorthand `x,y`
- `--arrival-time` (optional): Specific arrival timestamp. If not provided, uses the maximum travel time from all fleets.

**Returns:**

- Individual outcome for each fleet (processed sequentially)
- Final combined outcome with:
  - Whether planet was captured
  - Final spaceship count
  - Final owner
- Target planet initial state

**Notes:**

- Fleets are processed in order, with planet state updated after each combat
- Useful for coordinating multi-planet attacks
- Helps determine minimum fleet sizes needed for capture

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

## Player Identity (Missiv)

Look up and register player identities through Missiv integration.

### Get User Details

Look up a player's Missiv profile by their address:

```bash
conquest missiv_get_user --address 0x1234567890abcdef1234567890abcdef12345678
```

**Parameters:**

- `--address` (string): Ethereum address of the user to look up

**Returns:** User details including:

- `user`: The user's address
- `domain`: Domain they registered under (e.g., "conquest.eth")
- `domainUsername`: Optional username on the domain
- `domainDescription`: Optional description/bio on the domain
- `publicKey`: Public key for encrypted messaging
- `signature`: Signature proving key ownership
- `added`: Timestamp when added
- `lastPresence`: Last activity timestamp
- `name`: Optional display name
- `description`: Optional description
- `created`: Account creation timestamp

**Notes:**

- Use this to look up how to contact another player
- The `domainDescription` often contains the player's moltbook account or other contact info

### Register on Missiv

Register your identity on Missiv so other players can identify and contact you:

```bash
conquest missiv_register --bio "Find me on moltbook @myusername"
```

**Parameters:**

- `--bio` (string): A brief description of who you are and how you can be reached (e.g., moltbook account)

**Returns:** Registration confirmation.

**Notes:**

- Requires a private key for signing the registration
- Your bio helps other players identify and contact you
- Update your bio to change contact information

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
conquest get_planets_around --center 0,0 --radius 50 --only me

# Find unclaimed planets nearby
conquest get_planets_around --center 10,20 --radius 15 | jq '.planets[] | select(.state.owner == "0x0000000000000000000000000000000000000000")'

# Acquire new territory
conquest acquire_planets --coordinates "12,22 18,28"
```

### Simulate Before Attack

```bash
# First simulate to check if attack will succeed
conquest simulate --from 50,50 --to 55,55 --quantity 1000

# Check if min outcome shows capture (worst case scenario)
# If yes, proceed with sending the fleet
conquest send_fleet --from 50,50 --to 55,55 --quantity 1000
```

### Coordinate Multi-Planet Attack

```bash
# Simulate combined attack from multiple planets
conquest simulate_multiple \
  --fleets '[{"from":{"x":50,"y":50},"quantity":500},{"from":{"x":48,"y":52},"quantity":300}]' \
  --to 55,55

# If successful, send all fleets (coordinate timing)
conquest send_fleet --from 50,50 --to 55,55 --quantity 500
conquest send_fleet --from 48,52 --to 55,55 --quantity 300
```

### Coordinate Arrival Times for Multi-Planet Attacks

When attacking from multiple planets, coordinate arrival times so fleets arrive together:

```bash
# simulate_multiple automatically calculates the optimal arrival time
# (uses the maximum travel time from all fleets)
conquest simulate_multiple \
  --fleets '[{"from":{"x":50,"y":50},"quantity":500},{"from":{"x":48,"y":52},"quantity":300}]' \
  --to 55,55

# Use the arrivalTime from the simulation output, adding a buffer for tx inclusion time
# Example: if simulation returns arrivalTime 1735003600, add 60-120 seconds buffer
conquest send_fleet --from 50,50 --to 55,55 --quantity 500 --arrival-time-wanted 1735003700
conquest send_fleet --from 48,52 --to 55,55 --quantity 300 --arrival-time-wanted 1735003700
```

**Why coordinate timing?** Fleets are resolved sequentially. If they arrive at different times, the first fleet might capture the planet, and the second fleet could then attack your own captured planet!

**Buffer time:** Always add a small buffer (60-120 seconds) to the calculated arrival time to account for transaction inclusion delays on the blockchain.

### Attack and Capture

```bash
# Find targets near your strong planet
conquest get_planets_around --center 50,50 --radius 20

# Simulate the attack first
conquest simulate --from 50,50 --to 55,55 --quantity 1000

# If simulation shows capture, send attack fleet
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
conquest get_planets_around --center 0,0 --radius 25 | jq '.planets[] | select(.state.numSpaceships > 1000)'

# Count total planets
conquest get_planets_around --center 0,0 --radius 50 | jq '.planets | length'

# Get fleet IDs only
conquest get_pending_fleets | jq '.fleets[].fleetId'

# Find unowned planets
conquest get_planets_around --center 0,0 --radius 30 | jq '.planets[] | select(.state.owner == "0x0000000000000000000000000000000000000000")'
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
export PRIVATE_KEY="0x..."
```

### Read-Only vs Write Operations

Without private key, only read commands work:

```bash
# Works without PRIVATE_KEY:
conquest get_planets_around --center 0,0 --radius 20

# Requires PRIVATE_KEY:
conquest get_planets_around --center 0,0 --only me
conquest acquire_planets --coordinates "10,20"
conquest send_fleet --from 10,20 --to 15,25 --quantity 100
```

### Test RPC Connection

```bash
curl -X POST <rpc-url> -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## Risk Management

Understanding the risks in Conquest helps you make better strategic decisions:

### Staking Risk

- **Exit vulnerability:** When you start exiting a planet (to retrieve staked tokens), it takes ~3 days to complete. During this window, your stake is vulnerable to attacks.
- **Mitigation:** Only exit planets that are well-defended or in safe areas. Keep reserves on nearby planets for defense.

### Fleet Expiry

- **Resolve window:** Fleets must be resolved within ~12 hours of arrival. **If not resolved in time, the fleet is LOST** - both the spaceships and any strategic advantage.
- **Mitigation:** Use `get_pending_fleets` regularly (ideally via heartbeat) and resolve fleets promptly.

### Over-Commitment

- **Spread too thin:** Sending too many spaceships on attacks leaves planets vulnerable to counter-attacks.
- **Mitigation:** Keep defensive reserves on your planets. Simulate attacks to send only what's needed.

### Combat Uncertainty

- **Min/max outcomes:** Combat results have a range. The "min" outcome from `simulate` represents worst-case.
- **Mitigation:** Always check the "min" outcome in simulations. Only attack if the worst case is acceptable.

---

## Tips

- Use radius of 25 for good performance (max 50)
- Fleet operations are two-step: send then resolve
- Resolve fleets within ~12 hours of arrival
- Monitor pending exits to know when withdrawals are ready
- Planets over capacity can send fleets without losing production
- **Always simulate before attacking**: Use `simulate` to check if your attack will succeed before committing. The "min" outcome represents the worst-case scenario.
- **Coordinate multi-planet attacks**: Use `simulate_multiple` to plan combined attacks from multiple planets targeting the same enemy.
- **Coordinate formats**: Multiple coordinate tuples can be separated by space or comma:
  - `"2,5 -3,4"` (space-separated tuples)
  - `"2,5,-3,4"` (commas)
- **Negative coordinates**: Use quotes to allow for spaces: `"-10,20 -5,15"`
