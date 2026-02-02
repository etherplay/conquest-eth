# Migration to Hardhat Deploy v2

This document describes the migration from Mocha/ethers/chai to the new hardhat-deploy v2 format using `node:test`, `node:assert`, viem, and the rocketh environment API.

## Overview

The migration involved:

1. **Test Framework**: Mocha → `node:test` (native Node.js test runner)
2. **Assertions**: chai → `node:assert`
3. **EVM Library**: ethers → viem
4. **Test Utilities**: hardhat-network-helpers → accessed via `network.connect().networkHelpers`
5. **Deployment Loading**: Direct imports → `loadAndExecuteDeploymentsFromFiles({provider})`
6. **Test Fixtures**: Custom fixtures → `networkHelpers.loadFixture(deployAll)` for caching

## New Test Pattern

### Basic Test Structure

```typescript
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {network} from 'hardhat';
import {setupFixtures} from './fixtures/setupFixtures.js';

describe('ContractName', function () {
	let deployAll: any;
	let networkHelpers: any;

	before(async function () {
		const { provider, networkHelpers: nh } = await network.connect();
		networkHelpers = nh;
		const fixtures = setupFixtures(provider);
		deployAll = fixtures.deployAll;
	});

	it('test description', async function () {
		const { env, ContractName, unnamedAccounts } = 
			await networkHelpers.loadFixture(deployAll);
		
		const player = unnamedAccounts[0];
		
		// Use env.read for reading contract state
		const value = await env.read(ContractName, {
			functionName: 'someFunction',
			args: [param1, param2],
		});

		// Use env.execute for writing to contracts
		const hash = await env.execute(ContractName, {
			functionName: 'someWriteFunction',
			args: [param1, param2],
			account: player,
		});
		
		const receipt = await env.viem.publicClient.waitForTransactionReceipt({hash});
		
		assert.ok(receipt, 'Transaction receipt should exist');
	});
});
```

### Fixture Setup

Create fixtures in `test/fixtures/setupFixtures.ts`:

```typescript
import type {EthereumProvider} from 'hardhat/types/providers';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import type {Abi_YourContract} from '../../generated/abis/YourContract.js';

export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeploymentsFromFiles({
				provider: provider,
			});

			const YourContract = env.get<Abi_YourContract>('YourContract');

			return {
				env,
				YourContract,
				namedAccounts: env.namedAccounts,
				unnamedAccounts: env.unnamedAccounts,
			};
		},
	};
}
```

### Key API Patterns

#### Accessing Accounts

```typescript
// Named accounts (object)
const { deployer, agentService, claimKeyDistributor } = namedAccounts;

// Unnamed accounts (array)
const player1 = unnamedAccounts[0];
const player2 = unnamedAccounts[1];
```

#### Reading Contract State

```typescript
const value = await env.read(Contract, {
	functionName: 'owner',
});

const planet = await env.read(OuterSpace, {
	functionName: 'getPlanet',
	args: [planetId],
});
```

#### Executing Contract Functions

```typescript
// Simple execution
const hash = await env.execute(Contract, {
	functionName: 'transfer',
	args: [recipient, amount],
	account: sender,
});

// With ETH value
const hash = await env.execute(PaymentGateway, {
	functionName: 'fallback',
	value: parseEther('1'),
	account: sender,
});
```

#### Time Manipulation

```typescript
// Get network helpers from network.connect()
const { networkHelpers } = await network.connect();

// Increase time
await networkHelpers.time.increase(60); // 60 seconds

// Get latest timestamp
const timestamp = await networkHelpers.time.latest();
```

## Utility Functions

### Test Utilities (`test-utils.ts`)

```typescript
import {network} from 'hardhat';

// Time manipulation
export async function increaseTime(numSec: number): Promise<void> {
	const { networkHelpers } = await network.connect();
	await networkHelpers.time.increase(numSec);
}

export async function getTime(): Promise<number> {
	const { networkHelpers } = await network.connect();
	return await networkHelpers.time.latest();
}
```

### Object Mapping

```typescript
export function objMap(
	obj: any,
	func: (item: any, index: number) => any,
): any {
	const newObj: any = {};
	Object.keys(obj).map(function (key, index) {
		newObj[key] = func(obj[key], index);
	});
	return newObj;
}
```

## Viem Helpers

### Common Imports

```typescript
import {parseEther, encodeAbiParameters, keccak256, pad} from 'viem';
```

### Sending ETH

```typescript
const hash = await env.viem.walletClient.sendTransaction({
	to: recipient,
	value: parseEther('1'),
	account: sender,
});
```

### Signing Messages

```typescript
const {generatePrivateKey} = await import('viem/accounts');
const secret = generatePrivateKey();

const signature = await env.viem.walletClient.account!.signMessage({
	message: 'message to sign',
});
```

## Deployment Names

Use the actual deployment file names from `contracts/deployments/`:

| Deployment Name | Description |
|----------------|-------------|
| `OuterSpace` | Main OuterSpace contract |
| `ConquestCredits` | ConquestToken (ERC20 for staking) |
| `AllianceRegistry` | Alliance registry |
| `BasicAllianceFactory` | Factory for creating alliances |
| `PaymentGateway` | Payment gateway for ETH deposits |
| `PaymentWithdrawalGateway` | Payment gateway for ETH withdrawals |
| `Yakuza` | Yakuza contract |
| `RewardsGenerator` | Rewards generator |
| `FreePlayToken` | Free play token |
| `PlayToken` | Play token |

## Migration Checklist

- [x] Update test framework from Mocha to `node:test`
- [x] Update assertions from chai to `node:assert`
- [x] Replace ethers with viem
- [x] Replace hardhat-network-helpers with networkHelpers from `network.connect()`
- [x] Use `loadAndExecuteDeploymentsFromFiles({provider})` for loading deployments
- [x] Create fixture setup functions with caching via `networkHelpers.loadFixture`
- [x] Use `env.read()` for reading contract state
- [x] Use `env.execute()` for writing to contracts
- [x] Access named accounts via `env.namedAccounts` (object)
- [x] Access unnamed accounts via `env.unnamedAccounts` (array)
- [x] Update test utilities to work with new APIs

## Running Tests

```bash
# Run new tests
npm run test

# Run old tests (for reference)
npm run test:old
```

## Notes

1. **Fixture Caching**: Using `networkHelpers.loadFixture(deployAll)` ensures deployments are cached between tests, improving test performance.

2. **Type Safety**: Import ABIs from `generated/abis/` for type-safe contract interactions.

3. **Account Management**: Use `env.namedAccounts` for named accounts and `env.unnamedAccounts` for anonymous test accounts.

4. **Time Manipulation**: Access `networkHelpers.time` for time-related operations.

5. **Deployments**: Use `env.get(deploymentName)` to get typed deployment objects with address, linkedData, etc.