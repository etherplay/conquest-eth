---
name: mcp-conquest-eth-v0
description: Use Conquest.eth V0 MCP server to interact with a Conquest.eth game instance. Use when I need to: (1) observe the universe, (2) check on my planets, (3) send fleets to attack and send reinforcements (4) exit the planets with my stake (5) acquire planets
---

# Conquest.eth MCP Server

This skill teaches how to use the Conquest.eth MCP server to interact with a Conquest.eth game instance.

## Quick Commands

List available tools:

```bash
mcporter list mcp-conquest-eth-v0 --schema
```

Call a tool:

```bash
mcporter call mcp-conquest-eth-v0.<tool>
```

## Common Commands

### Get Your Planets

Get all planets you own within a radius of the origin (0,0):

```bash
mcporter call mcp-conquest-eth-v0.get_my_planets '{"radius": 25}'
```

**Parameters:**
- `radius` (number, max 50): Search radius around origin (0,0) to find planets. Use 25 as a default.

**Returns:** Array of your planets with their locations, spaceship counts, and other stats.

### Find Planets Around a Location

Find planets near specific coordinates:

```bash
mcporter call mcp-conquest-eth-v0.get_planets_around '{"centerX": 10, "centerY": 20, "radius": 25}'
```

**Parameters:**
- `centerX` (number): X coordinate of center point
- `centerY` (number): Y coordinate of center point
- `radius` (number, max 50): Radius to search around the center point

**Returns:** Array of planets with distances, owners, and stats.

### Acquire Planets

Stake tokens to claim ownership of unclaimed planets:

```bash
mcporter call mcp-conquest-eth-v0.acquire_planets '{"coordinates": [{"x": 10, "y": 20}, {"x": 15, "y": 25}, {"x": 20, "y": 30}]}'
```

**Parameters:**
- `coordinates` (array of objects): Planet coordinates to acquire, each object with `x` and `y` properties
- `amountToMint` (number, optional): Amount of native token to spend. Auto-calculated if not provided.
- `tokenAmount` (number, optional): Amount of staking token to spend. Auto-calculated if not provided.

**Returns:** Transaction hash and list of planets acquired.

**Notes:**
- The tokens you deposit are not spent - they remain on the planet until you exit
- Exiting a planet takes time (typically 3 days), during which someone can attack and take your stake
- You can only acquire planets in the allowed zone (expands as planets are claimed near borders)
- If the planet has natives, you'll fight them (attack power 10,000, fleet of 100,000 spaceships)
- If planet is empty or you already control it, you'll get 100,000 spaceships

### Send Fleet

Send spaceships from one of your planets to another:

```bash
mcporter call mcp-conquest-eth-v0.send_fleet '{"from": {"x": 10, "y": 20}, "to": {"x": 15, "y": 25}, "quantity": 100}'
```

**Parameters:**
- `from` (object): Source planet coordinates `{x, y}`
- `to` (object): Destination planet coordinates `{x, y}`
- `quantity` (number): Number of spaceships to send
- `arrivalTimeWanted` (number, optional): Desired arrival time (timestamp in seconds). Auto-calculated based on distance if not provided.
- `gift` (boolean, optional): Whether the fleet is a gift (sent without requiring arrival). Default: false.
- `specific` (string, optional): Additional specific data for the fleet.

**Returns:** Fleet ID, source/destination planet IDs, quantity, arrival time, and secret.

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
mcporter call mcp-conquest-eth-v0.resolve_fleet '{"fleetId": "your-fleet-id"}'
```

**Parameters:**
- `fleetId` (string): Fleet ID to resolve

**Returns:** Fleet information including source, destination, and quantity.

**Notes:**
- Must be called after the fleet arrival time + resolve window
- If you don't resolve within ~12 hours after arrival, the fleet is lost forever
- When resolved, if destination is enemy, combat occurs immediately
- Combat outcome depends on: fleet quantity, attack stat of source planet, defender's spaceship count, defense stat of destination planet, and size factor

### Exit Planets

Start the exit process to retrieve staked tokens:

```bash
mcporter call mcp-conquest-eth-v0.exit_planets '{"coordinates": [{"x": 10, "y": 20}, {"x": 15, "y": 25}, {"x": 20, "y": 30}]}'
```

**Parameters:**
- `coordinates` (array of objects): Planet coordinates to exit, each object with `x` and `y` properties

**Returns:** Transaction hash and list of exits initiated.

**Notes:**
- Exit process takes time (typically 3 days)
- During exit, your stake is vulnerable to attacks
- Once complete, you can withdraw your tokens
- You must call `verify_exit_status` after the exit duration to complete the withdrawal

### Check Pending Exits

View all planets currently in the exit process:

```bash
mcporter call mcp-conquest-eth-v0.get_pending_exits '{}'
```

**Returns:** Array of pending exits with planet IDs, start times, durations, completion times, and spaceship counts.

### Check Pending Fleets

View all fleets you've sent that are still traveling:

```bash
mcporter call mcp-conquest-eth-v0.get_pending_fleets '{}'
```

**Returns:** Array of pending fleets with fleet IDs, source/destination planets, quantities, arrival times, and resolve status.

### Verify Exit Status

Check if an exit has completed and can be withdrawn:

```bash
mcporter call mcp-conquest-eth-v0.verify_exit_status '{"x": 10, "y": 20}'
```

**Parameters:**
- `x` (number): X coordinate of the planet to verify
- `y` (number): Y coordinate of the planet to verify

**Returns:** Exit status information including completion status.

## When to Use This Skill

Use Conquest.eth MCP when you need to:

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

## Notes

- Always use small radius (25 is a good number) for better performance
- Fleet operations are two-step: send then resolve
- Planets at over capacity can send fleets without losing production
- Keep track of your pending fleets to ensure you resolve them on time
- Monitor your pending exits to know when withdrawals are available
