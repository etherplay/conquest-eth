# Test Migration to Hardhat-Deploy v2 Plan

## Overview

This document outlines the migration plan for converting tests from `contracts/test-old/` to hardhat-deploy v2 format with `node:test` as the test runner.

## Key Migration Principles

1. **Test Runner**: Switch from Mocha to `node:test` (native Node.js test runner)
2. **Assertion Library**: Switch from chai-ethers to native `node:assert` and hardhat-network-helpers
3. **Target Directory**: Create new `test/` directory, keep `test-old/` for reference
4. **Test Utilities**: Replace custom utilities with hardhat-network-helpers where possible

## Directory Structure

```
contracts/
├── test/                          # NEW - Migrated tests
│   ├── test.config.ts             # Test configuration
│   ├── test-utils.ts              # Test utilities (hardhat-network-helpers wrapper)
│   ├── fixtures/                  # Test fixtures
│   │   └── outerspaceAndPlayerWithTokens.ts
│   ├── utils/                     # Test utilities
│   │   └── index.ts               # User setup utilities
│   ├── agent/                     # Agent tests
│   │   ├── agent.test.ts
│   │   ├── PaymentGateway.test.ts
│   │   └── PaymentWithdrawalGateway.test.ts
│   ├── alliances/                 # Alliance tests
│   │   └── basicalliances.test.ts
│   ├── outerspace/                # Outerspace tests
│   │   ├── outerSpace.test.ts
│   │   ├── misc.test.ts
│   │   ├── sol2js.test.ts
│   │   └── utils.ts
│   ├── outerspace-old/            # Old Outerspace tests
│   │   ├── outerSpace-basic.test.ts
│   │   └── utils.ts
│   └── gas/                       # Gas tests
│       └── testGas.ts
└── test-old/                      # OLD - Keep for reference
    └── (existing files)
```

## Migration Strategy

### Phase 1: Infrastructure Setup

#### 1.1 Create test TypeScript configuration
- Create `test/tsconfig.json` extending main tsconfig
- Configure for node:test compatibility
- Ensure proper module resolution

#### 1.2 Create test utilities module
Replace custom utilities with hardhat-network-helpers:

| Old Utility | Replacement |
|-------------|-------------|
| `expectRevert()` | `assert.rejects()` or `@nomicfoundation/hardhat-chai-matchers` |
| `increaseTime()` | `time.increase()` from `@nomicfoundation/hardhat-network-helpers` |
| `getTime()` | `time.latest()` from helpers |
| `waitFor()` | `await tx.wait()` (native ethers) |
| `objMap()` | Keep as custom utility (no direct replacement) |
| `zeroAddress` | `zeroAddress` from `viem` or define constant |
| `emptyBytes` | Define constant |

#### 1.3 Create fixture utilities using v2
Replace `deployments.createFixture()` with custom fixtures using:
- `loadAndExecuteDeploymentsFromFiles()` from `rocketh/environment.ts`
- Create reusable fixture functions

#### 1.4 Create user setup utilities
Adapt `setupUsers()` and `setupUser()` for v2:
- Replace `ethers.getContract()` with `env.get<ContractType>()`
- Use `env.namedAccounts` and `env.unnamedAccounts`

### Phase 2: Test File Conversions

#### 2.1 Conversion Pattern

**Old Pattern (test-old):**
```typescript
import {describe, it} from 'mocha';
import {expect} from '../chai-setup';
import {deployments, ethers} from 'hardhat';

const setup = deployments.createFixture(async () => {
  await deployments.fixture();
  const contracts = {
    Contract: await ethers.getContract('Contract'),
  };
  return {contracts};
});

describe('Contract', function () {
  it('does something', async function () {
    const {contracts} = await setup();
    await contracts.Contract.doSomething();
  });
});
```

**New Pattern (test/):**
```typescript
import {describe, it, before} from 'node:test';
import assert from 'node:assert';
import {loadAndExecuteDeploymentsFromFiles} from '../rocketh/environment.js';
import type {Environment} from '../rocketh/config.js';
import {setupUsers} from './utils/index.js';
import type {ContractName} from '../generated/artifacts/ContractName.js';

async function setupFixture(): Promise<{
  env: Environment;
  users: ReturnType<typeof setupUsers>;
  Contract: ContractName;
}> {
  const env = await loadAndExecuteDeploymentsFromFiles();
  const accounts = await env.accounts();
  
  const Contract = await env.get<ContractName>('Contract');
  const users = setupUsers(accounts.unnamedAccounts, {Contract});
  
  return {env, users, Contract};
}

describe('Contract', function () {
  let fixture: Awaited<ReturnType<typeof setupFixture>>;

  before(async () => {
    fixture = await setupFixture();
  });

  it('does something', async () => {
    const {Contract} = fixture;
    await Contract.write.doSomething();
  });
});
```

#### 2.2 Specific Test Migrations

##### 2.2.1 agent/agent.test.ts
- Uses `deployments.deploy()` with `deterministicDeployment`
- Convert to `env.deploy()` or use viem deployment
- Replace `ethers.getContract()` with `env.get<Agent>()`

##### 2.2.2 agent/PaymentGateway.test.ts
- Uses `deployments.fixture('PaymentGateway_deploy')`
- Uses `ethers.getContract()`, `setupUsers()`, `setupUser()`
- Uses `parseEther` from ethers - replace with viem's `parseEther`
- Uses `expect` from chai - replace with `node:assert`
- Uses `waitFor` - replace with native `await tx.wait()`

##### 2.2.3 agent/PaymentWithdrawalGateway.test.ts
- Similar to PaymentGateway.test.ts
- Uses `ethers.utils.defaultAbiCoder.encode` - replace with `encodeAbiParameters` from viem
- Uses `ethers.utils.keccak256` - replace with `keccak256` from viem
- Uses `ethers.utils.arrayify` - replace with `toBytes` from viem
- Uses `ethers.provider.getBlock()` - replace with `env.publicClient.getBlock()`
- Uses `increaseTime()` - replace with `time.increase()` from hardhat-network-helpers

##### 2.2.4 alliances/basicalliances.test.ts
- Uses `deployments.read()` - replace with `env.read()` or direct contract call
- Uses `hexZeroPad` from ethers - replace with `pad` from viem
- Uses `signMessage` - compatible with viem

##### 2.2.5 outerspace/outerSpace.test.ts
- Simple test using fixture
- Convert fixture to use `loadAndExecuteDeploymentsFromFiles()`

##### 2.2.6 outerspace/misc.test.ts
- Uses `deployments.deploy()` directly
- Uses `ethers.getContract()` and `setupUsers()`
- Uses `expect` from chai - replace with `node:assert`
- Uses `objMap()` - keep as custom utility

##### 2.2.7 outerspace/sol2js.test.ts
- Uses fixture and `objMap()` for data conversion
- Uses `expect` from chai - replace with `node:assert`

##### 2.2.8 outerspace-old/outerSpace-basic.test.ts
- Uses `setupOuterSpace()` utility from outerspace-old/utils.ts
- Uses `expectRevert()` - replace with `assert.rejects()`
- Uses `waitFor()` - replace with native
- Uses `increaseTime()` - replace with hardhat-network-helpers
- Uses `defaultAbiCoder.encode` - replace with viem

#### 2.3 Utility File Migrations

##### 2.3.1 test/utils/index.ts
- Update `setupUsers()` to use `env.get<ContractType>()` pattern
- Update `setupUser()` for v2 compatibility
- Keep `EIP712Signer` classes (they're framework-agnostic)

##### 2.3.2 test/outerspace/utils.ts
- Replace `waitFor()` with native
- Replace ethers imports with viem equivalents:
  - `BigNumber` → `bigint`
  - `Wallet.createRandom().privateKey` → `generatePrivateKey()`
  - `keccak256` → `keccak256` from viem
  - `Contract` → viem contract types
- Replace `defaultAbiCoder.encode` with viem's `encodeAbiParameters`
- Update types to use generated artifacts

##### 2.3.3 test/outerspace-old/utils.ts
- Replace `increaseTime`, `waitFor`, `objMap` imports
- Replace ethers imports with viem equivalents
- Replace `parseEther` with viem's `parseEther`
- Update `createPlayerAsContracts()` to use `env.get<ContractType>()`

### Phase 3: Configuration Updates

#### 3.1 Update hardhat.config.ts
- Configure `@nomicfoundation/hardhat-node-test-runner` for node:test
- Ensure test discovery finds the new `test/` directory
- Add test-specific settings if needed

#### 3.2 Update package.json scripts
- Update `"test"` script to use node:test runner
- Update `"test:watch"` for the new directory structure
- Consider adding separate script to run old tests for comparison

```json
{
  "scripts": {
    "test": "hardhat test",
    "test:watch": "wait-on ./generated && as-soon -w generated -w test hardhat test --no-compile",
    "test:old": "hardhat test test-old"
  }
}
```

### Phase 4: Verification

#### 4.1 Run all tests
```bash
pnpm compile
pnpm test
```

#### 4.2 Compare results
- Run old tests to ensure behavior matches
- Check for any test failures
- Fix any issues found

#### 4.3 Update documentation
- Update `MIGRATION_TO_HARDHAT_DEPLOY_V2.md` with test migration status
- Add notes about any breaking changes or special considerations

## Import Mapping Summary

| Old Import | New Import |
|------------|------------|
| `import {describe, it} from 'mocha'` | `import {describe, it, before, after} from 'node:test'` |
| `import {expect} from 'chai'` | `import assert from 'node:assert'` |
| `import {chaiEthers} from 'chai-ethers'` | `import {assert} from 'node:assert'` |
| `import {ethers} from 'hardhat'` | `import {viem} from 'hardhat'` or direct viem imports |
| `import {deployments} from 'hardhat'` | `import {loadAndExecuteDeploymentsFromFiles} from './rocketh/environment.js'` |
| `import {getNamedAccounts} from 'hardhat'` | Use `env.namedAccounts` or `await env.accounts()` |
| `import {getUnnamedAccounts} from 'hardhat'` | Use `env.unnamedAccounts` or `await env.accounts()` |
| `import {parseEther} from '@ethersproject/units'` | `import {parseEther} from 'viem'` |
| `import {keccak256} from '@ethersproject/solidity'` | `import {keccak256} from 'viem'` |
| `import {defaultAbiCoder} from '@ethersproject/abi'` | `import {encodeAbiParameters, decodeAbiParameters} from 'viem'` |
| `import {Wallet} from '@ethersproject/wallet'` | `import {generatePrivateKey, privateKeyToAccount} from 'viem/accounts'` |

## Special Considerations

1. **Time Manipulation**: The `test-old` uses a custom `extraTime` tracking variable. In v2, use `time.increase()` from hardhat-network-helpers which handles this internally.

2. **BigNumber Handling**: Ethers uses `BigNumber` class, while viem uses native JavaScript `bigint`. All BigNumber operations need to be converted.

3. **Contract Types**: In v2, contract types are generated in `generated/artifacts/` and should be imported from there for full type safety.

4. **Event Emission**: Chai's `.to.emit()` pattern needs to be replaced with `viem`'s event handling or hardhat-network-helpers' `getEvents()` helper.

5. **Fixture Tags**: Some old tests use `deployments.fixture('PaymentGateway_deploy')`. In v2, use `loadAndExecuteDeploymentsFromFiles()` with the appropriate deploy folder or tag filtering.

## Next Steps

Once this plan is approved, switch to Code mode to begin implementation starting with Phase 1 (Infrastructure Setup).