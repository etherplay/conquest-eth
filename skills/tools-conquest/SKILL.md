---
name: tools-conquest
description: Use the Conquest.eth CLI tool directly to interact with a Conquest.eth game instance. Use when I need to: (1) observe the universe, (2) check on my planets, (3) send fleets to attack and send reinforcements (4) exit the planets with my stake (5) acquire planets
---

# Conquest.eth CLI Tool

This skill teaches how to use the Conquest.eth CLI tool directly to interact with a Conquest.eth game instance.

## Installation

Install the npm package:

```bash
npm install -g @conquest-eth/tools
```

Or use pnpm:

```bash
pnpm add -g @conquest-eth/tools
```

This installs the `conquest` binary globally on your system.

## Setup

Before using the CLI, set up environment variables for your game connection:

```bash
export RPC_URL=https://rpc.gnosischain.com
export GAME_CONTRACT=0x322813fd9a801c5507c9de605d63cea4f2ce6c44
export PRIVATE_KEY=0x...  # Required for write operations
```

Alternatively, pass these as command-line flags to every command (except PRIVATE_KEY which need to be set in the env variable).

## Common Commands

### Show Help

Get help with available commands:

```bash
conquest --help
```

Get help for a specific command:

```bash
conquest get_my_planets --help
```

### Get Your Planets

Get all planets you own within a radius of the origin (0,0):

```bash
conquest get_my_planets --radius 25
```

**Parameters:**

- `--radius` (number, max 50): Search radius around origin (0,0) to find planets. Use 25 as a default.

**Returns:** JSON with array of your planets including their locations, spaceship counts, and other stats.

**Example output:**

```json
{
  "planets": [
    {
      "planetId": "123",
      "location": {"id": "123", "x": 10, "y": 20},
      "numSpaceships": 5000,
      "owner": "0x...",
      "active": true
    }
  ]
}
```

### Find Planets Around a Location

Find planets near specific coordinates:

```bash
conquest get_planets_around --center 10,20 --radius 25
```

**Parameters:**

- `--center <x,y>` (coordinates): Center point coordinates in x,y format
- `--radius` (number, max 50): Radius to search around the center point

**Returns:** JSON with array of planets including distances, owners, and stats.

### Acquire Planets

Stake tokens to claim ownership of unclaimed planets:

```bash
# Using JSON array format for coordinates
conquest acquire_planets --coordinates '[{"x":10,"y":20},{"x":15,"y":25},{"x":20,"y":30}]'

# With custom amounts
conquest acquire_planets --coordinates '[{"x":10,"y":20},{"x":15,"y":25}]' --amount-to-mint 1000000 --token-amount 500
```

**Parameters:**

- `--coordinates` (JSON array): Array of planet coordinate objects to acquire, e.g., `[{"x":10,"y":20},{"x":15,"y":25}]`
- `--amount-to-mint` (number, optional): Amount of native token to spend. Auto-calculated if not provided.
- `--token-amount` (number, optional): Amount of staking token to spend. Auto-calculated if not provided.

**Returns:** JSON with transaction hash and list of planets acquired.

**Notes:**

- The tokens you deposit are not spent - they remain on the planet until you exit
- Exiting a planet takes time (typically 3 days), during which someone can attack and take your stake
- You can only acquire planets in the allowed zone (expands as planets are claimed near borders)
- If the planet has natives, you'll fight them (attack power 10,000, fleet of 100,000 spaceships)
- If planet is empty or you already control it, you'll get 100,000 spaceships

### Send Fleet

Send spaceships from one of your planets to another:

```bash
conquest send_fleet \
  --from 10,20 \
  --to 15,25 \
  --quantity 100
```

With optional parameters:

```bash
conquest send_fleet \
  --from 10,20 \
  --to 15,25 \
  --quantity 100 \
  --arrivalTimeWanted 1735123456 \
  --gift
```

**Parameters:**

- `--from <x,y>` (coordinates): Source planet coordinates in x,y format
- `--to <x,y>` (coordinates): Destination planet coordinates in x,y format
- `--quantity` (number): Number of spaceships to send
- `--arrivalTimeWanted` (number, optional): Desired arrival time (timestamp in seconds). Auto-calculated based on distance if not provided.
- `--gift` (flag, optional): Whether the fleet is a gift (sent without requiring arrival).
- `--specific` (string, optional): Additional specific data for the fleet.

**Returns:** JSON with fleet ID, source/destination planet IDs, quantity, arrival time, and secret.

**Notes:**

- Sending fleets is a two-step process: send the fleet, then resolve it after arrival
- While the fleet travels, only you know where it's going
- If destination is not an ally, fleet will attack by default
- If sending to non-allies as a gift, only 80% of spaceships will arrive (20% burn tax)
- Fleets use the attack and speed characteristics of their origin planets
- Spaceships sent from your planet also reduce your defense

### Resolve Fleet

Reveal a fleet's destination and trigger combat (must be done after arrival time + resolve window):

```bash
conquest resolve_fleet --fleet-id "your-fleet-id"
```

**Parameters:**

- `--fleet-id` (string): Fleet ID to resolve

**Returns:** JSON with fleet information including source, destination, and quantity.

**Notes:**

- Must be called after the fleet arrival time + resolve window
- If you don't resolve within ~12 hours after arrival, the fleet is lost forever
- When resolved, if destination is enemy, combat occurs immediately
- Combat outcome depends on: fleet quantity, attack stat of source planet, defender's spaceship count, defense stat of destination planet, and size factor

### Exit Planets

Start the exit process to retrieve staked tokens:

```bash
# Using JSON array format for coordinates
conquest exit_planets --coordinates '[{"x":10,"y":20},{"x":15,"y":25},{"x":20,"y":30}]'
```

**Parameters:**

- `--coordinates` (JSON array): Array of planet coordinate objects to exit, e.g., `[{"x":10,"y":20},{"x":15,"y":25}]`

**Returns:** JSON with transaction hash and list of exits initiated.

**Notes:**

- Exit process takes time (typically 3 days)
- During exit, your stake is vulnerable to attacks
- Once complete, you can withdraw your tokens
- You must call `verify_exit_status` after the exit duration to complete the withdrawal

### Check Pending Exits

View all planets currently in the exit process:

```bash
conquest get_pending_exits
```

**Returns:** JSON array of pending exits with planet IDs, start times, durations, completion times, and spaceship counts.

### Check Pending Fleets

View all fleets you've sent that are still traveling:

```bash
conquest get_pending_fleets
```

**Returns:** JSON array of pending fleets with fleet IDs, source/destination planets, quantities, arrival times, and resolve status.

### Verify Exit Status

Check if an exit has completed and can be withdrawn:

```bash
conquest verify_exit_status --x 10 --y 20
```

**Parameters:**

- `--x` (number): X coordinate of the planet to verify
- `--y` (number): Y coordinate of the planet to verify

**Returns:** JSON with exit status information including completion status.

## When to Use This Skill

Use Conquest.eth CLI when you need to:

- Observe the universe: Check planets around locations, explore the map
- Check on your planets: View your owned planets, their spaceship counts, and stats
- Send fleets to attack: Find targets and send attack fleets to enemy planets
- Send reinforcements: Support allies by sending friendly fleets
- Expand your territory: Acquire unclaimed planets in available zones
- Exit planets: Retrieve your staked tokens when done with a planet

## Gameplay Fundamentals

### Planets

Planets are the main objects you can own in conquest.eth. Each planet has immutable statistics:

- **Capacity**: Max spaceships before production stops. When exceeded, spaceships decrease at 1 every 2 seconds.
- **Natives**: Local population before claiming. When staking, you fight them with 10,000 attack power and 100,000 spaceships.
- **Stake**: Amount of token you deposit to make the planet produce spaceships.
- **Production**: Spaceships produced per hour when staked.
- **Attack**: Attack power of fleets sent from this planet.
- **Defense**: Defense power protecting the planet from enemy fleets.
- **Speed**: Speed multiplier for fleets sent from this planet.
- **Upkeep**: Increases when spaceships are sent away. Reduces production by 50% until upkeep reaches zero.

### Combat

Combat occurs when a fleet arrives at an enemy or unclaimed planet. The outcome depends on:

- `numAttack`: Number of spaceships in the fleet
- `attack`: Attack value of the source planet
- `numDefense`: Number of spaceships on the destination planet
- `defense`: Defense value of the destination planet
- `sizeFactor`: Extra contribution based on spaceship count (currently 0.5)

**Attack Formula:**

```
attackFactor = numAttack * ((1000000 - sizeFactor*1000000) + (sizeFactor*1000000 * numAttack / numDefense))
attackDamage = (attackFactor * attack) / defense / 1000000
```

If `attackDamage < numDefense`: Attack fails, all attacking spaceships destroyed, defender loses `attackDamage` spaceships.

If `attackDamage >= numDefense`: Attack succeeds, all defending spaceships destroyed. Attacker loses some spaceships calculated similarly using defender's attack value.

### Typical Game Loop

1. **Explore**: Use `get_my_planets` and `get_planets_around` to understand your position
2. **Expand**: Use `acquire_planets` to claim new territory
3. **Build**: Wait for planets to produce spaceships up to capacity
4. **Attack**: Use `send_fleet` to attack enemies or reinforce allies
5. **Resolve**: Use `resolve_fleet` after fleets arrive to trigger combat
6. **Defend**: Monitor your planets and send reinforcements if needed
7. **Exit**: Use `exit_planets` when you want to retrieve your stake

## Workflow Examples

### Example 1: Complete Game Loop

```bash
# 1. Find your planets
conquest get_my_planets --radius 50

# 2. Find targets near one of your planets
conquest get_planets_around --center 10,20 --radius 15

# 3. Send a fleet to attack
conquest send_fleet --from 10,20 --to 12,22 --quantity 100

# 4. Wait for fleet to arrive, then resolve
conquest resolve_fleet --fleet-id "your-fleet-id"

# 5. Check your new planets
conquest get_my_planets --radius 50
```

### Example 2: Expand Territory

```bash
# Find unclaimed planets
conquest get_planets_around --center 0,0 --radius 30

# Acquire multiple planets using JSON array format
conquest acquire_planets --coordinates '[{"x":10,"y":20},{"x":15,"y":25},{"x":20,"y":30},{"x":25,"y":35},{"x":30,"y":40}]'
```

### Example 3: Exit Planets

```bash
# Start exit process for multiple planets
conquest exit_planets --coordinates '[{"x":10,"y":20},{"x":15,"y":25},{"x":20,"y":30}]'

# Check pending exits
conquest get_pending_exits

# Verify exit status (after 7 days)
conquest verify_exit_status --x 10 --y 20
```

### Example 4: Monitor and Attack

```bash
# Check current state
conquest get_my_planets --radius 25
conquest get_pending_fleets

# Find targets near your strongest planet
conquest get_planets_around --center 50,50 --radius 20

# Send attack fleet
conquest send_fleet --from 50,50 --to 55,55 --quantity 1000

# Monitor fleet status
conquest get_pending_fleets

# Resolve when ready
conquest resolve_fleet --fleet-id "your-fleet-id"
```

## Using with Other Tools

The CLI outputs JSON, making it easy to pipe to other tools:

```bash
# Filter planets with lots of spaceships
conquest get_my_planets --radius 10 | jq '.planets[] | select(.numSpaceships > 1000)'

# Count your total planets
conquest get_my_planets --radius 50 | jq '.planets | length'

# Get fleet IDs only
conquest get_pending_fleets | jq '.fleets[].fleetId'

# Find unowned planets
conquest get_planets_around --center 0,0 --radius 30 | jq '.planets[] | select(.owner == "0x0000000000000000000000000000000000000000")'
```

## Common Issues

### Private Key Format

Your private key must start with `0x`:

```bash
export PRIVATE_KEY=0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
```

### No Private Key Warning

If you don't set a private key, you can still use read-only commands but write operations will fail:

```bash
# These will work:
conquest get_my_planets --radius 10
conquest get_planets_around --center 0,0 --radius 20

# These will fail without a private key:
conquest acquire_planets --coordinates '[{"x":10,"y":20},{"x":15,"y":25}]'
conquest send_fleet --from 10,20 --to 15,25 --quantity 100
```

### RPC URL

Make sure your RPC URL is accessible:

```bash
# Test your RPC URL
curl -X POST https://rpc.gnosischain.com -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Notes

- Always use small radius (25 is a good number) for better performance
- Fleet operations are two-step: send then resolve
- Planets at over capacity can send fleets without losing production
- Keep track of your pending fleets to ensure you resolve them on time
- Monitor your pending exits to know when withdrawals are available
- All commands return JSON output for easy parsing and integration with other tools
- For `acquire_planets` and `exit_planets`, use JSON array format for the `--coordinates` parameter: `[{"x":10,"y":20},{"x":15,"y":25}]`