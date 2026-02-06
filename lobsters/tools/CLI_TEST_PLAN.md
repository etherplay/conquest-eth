# CLI Test Plan for tools-conquest

## Overview

This document outlines the plan for creating comprehensive CLI tests for the tools-conquest package, following the testing mechanics from tools-ethereum.

## Existing Infrastructure

### Test Setup (`test/setup.ts`)
- Uses Prool for local Ethereum node testing
- Deploys game contracts using rocketh from `conquest-eth-v0-contracts`
- Provides test context with chain, RPC clients, and deployed contracts
- Global setup/teardown for test environment

### CLI Utilities (`test/cli-utils.ts`)
- `invokeCliCommand()` - Executes CLI commands in subprocess for true process isolation
- Handles environment variable isolation
- Captures stdout, stderr, and exit codes
- Supports custom timeout and env var configuration

### Example Test (`test/cli/simple.test.ts`)
- Demonstrates basic pattern for CLI testing
- Uses `setupTestEnvironment()` and `teardownTestEnvironment()`
- Shows how to access deployed contract addresses

## Tools to Test

### Read-Only Operations
1. **get_my_planets** - Get planets owned by current user
2. **get_planets_around** - Get planets around a center point
3. **get_pending_fleets** - Get pending fleets sent from user's planets
4. **get_pending_exits** - Get pending exit operations

### Write Operations
5. **acquire_planets** - Acquire/stake multiple planets
6. **send_fleet** - Send a fleet from one planet to another
7. **resolve_fleet** - Resolve a previously sent fleet
8. **exit_planets** - Exit/unstake multiple planets

### Verification Operations
9. **verify_exit_status** - Check and update exit operation status

## Test Structure

### File Organization

```
test/cli/
├── simple.test.ts              # Existing - basic example
├── readonly.test.ts            # New - read-only operations
├── write-operations.test.ts    # New - write operations
├── fleet-lifecycle.test.ts     # New - fleet send/resolve flow
├── planet-lifecycle.test.ts    # New - acquire/exit flow
├── error-handling.test.ts      # New - validation and error cases
├── cli-options.test.ts         # New - CLI options and flags
└── helpers.ts                  # New - shared test helpers
```

### Test Categories

#### 1. Read-Only Operations (`readonly.test.ts`)
Test that read operations work correctly and return expected data:
- `get_my_planets` with various radius values
- `get_planets_around` with different centers and radii
- `get_pending_fleets` (initially empty, then with data)
- `get_pending_exits` (initially empty, then with data)

#### 2. Write Operations (`write-operations.test.ts`)
Test individual write operations:
- `acquire_planets` with auto-calculation
- `acquire_planets` with explicit amounts
- `acquire_planets` with multiple coordinates
- `exit_planets` with single and multiple planets

#### 3. Fleet Lifecycle (`fleet-lifecycle.test.ts`)
Test the complete fleet operation flow:
- Acquire source and destination planets
- Send a fleet from source to destination
- Wait for arrival time
- Resolve the fleet
- Verify fleet data

#### 4. Planet Lifecycle (`planet-lifecycle.test.ts`)
Test the complete planet ownership flow:
- Acquire multiple planets
- Get my planets
- Verify ownership
- Initiate exits
- Check pending exits
- Verify exit status

#### 5. Error Handling (`error-handling.test.ts`)
Test error cases and validation:
- Missing required parameters
- Invalid coordinate values (no planet at location)
- Invalid RPC URL
- Invalid game contract address
- Malformed private key
- Missing private key for write operations

#### 6. CLI Options (`cli-options.test.ts`)
Test CLI option handling:
- `--rpc-url` option precedence (option > env var)
- `--game-contract` option precedence
- `--storage` and `--storage-path` options
- `--private-key` option
- Global vs local option precedence

## Test Implementation Details

### Test Helpers (`test/cli/helpers.ts`)

```typescript
// Helper functions for common test operations
export async function acquireTestPlanets(coordinates: Array<{x: number, y: number}>): Promise<void>
export async function sendTestFleet(from: {x: number, y: number}, to: {x: number, y: number}, quantity: number): Promise<string>
export async function waitForArrival(fleetId: string): Promise<void>
export async function parseCliOutput<T>(output: string): Promise<T>
export function getTestPrivateKey(): string
```

### Test Patterns

#### Basic Tool Test
```typescript
describe('tool_name', () => {
  it('should execute successfully', async () => {
    const {stdout, exitCode} = await invokeCliCommand([
      '--rpc-url', RPC_URL,
      '--game-contract', gameContract,
      'tool_name',
      '--param', 'value'
    ]);
    
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result).toMatchObject({ /* expected */ });
  });
});
```

#### Error Test
```typescript
it('should return error for invalid input', async () => {
  const {stdout, exitCode} = await invokeCliCommand([
    '--rpc-url', RPC_URL,
    '--game-contract', gameContract,
    'tool_name',
    '--invalid-param', 'value'
  ]);
  
  expect(exitCode).not.toBe(0);
  const result = JSON.parse(stdout);
  expect(result.error).toBeDefined();
});
```

## Test Data Strategy

### Test Coordinates
Use fixed coordinates that correspond to known planets:
- (0, 0) - Center planet
- (1, 0), (0, 1), (-1, 0), (0, -1) - Adjacent planets
- (10, 10), (-10, -10) - Distant planets for radius tests

### Test Timeouts
- Read-only tests: 10 seconds
- Write operation tests: 30 seconds
- Lifecycle tests: 60 seconds (includes waiting for arrival/exit times)

## Implementation Steps

1. ✅ Review existing test infrastructure
2. ✅ Create test helpers file (`test/cli/helpers.ts`)
3. ✅ Implement read-only operations tests (`test/cli/readonly.test.ts`)
4. ✅ Implement write operations tests (`test/cli/write-operations.test.ts`)
5. ✅ Implement fleet lifecycle tests (`test/cli/fleet-lifecycle.test.ts`)
6. ✅ Implement planet lifecycle tests (`test/cli/planet-lifecycle.test.ts`)
7. ✅ Implement error handling tests (`test/cli/error-handling.test.ts`)
8. ✅ Implement CLI options tests (`test/cli/cli-options.test.ts`)
9. ✅ Run all tests and verify they pass
10. ✅ Update documentation with test examples

## Notes

- Tests use subprocess execution for true CLI process isolation
- Each test file should have its own describe block with proper setup/teardown
- Use the existing `simple.test.ts` as a reference for the testing pattern
- Consider performance: contract deployment is slow, so use shared test context
- The `beforeAll` timeout may need to be increased for complex tests
- All BigInt values in output should be serialized to strings for JSON parsing