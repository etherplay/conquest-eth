# Migration to hardhat-deploy v2 and rocketh

This document summarizes the migration of the conquest-eth-contracts project from hardhat-deploy v1 to v2 with rocketh integration.

## Completed Changes

### 1. Package Dependencies

Updated [`package.json`](package.json:1) with:
- Added `"type": "module"` for ESM support
- Updated `hardhat` to `^3.1.5`
- Updated `hardhat-deploy` to `^2.0.0-next.66`
- Added rocketh packages: `rocketh`, `@rocketh/deploy`, `@rocketh/read-execute`, `@rocketh/node`, `@rocketh/signer`, `@rocketh/proxy`
- Added `viem` for contract interactions
- Added Hardhat 3.x plugins: `@nomicfoundation/hardhat-viem`, `@nomicfoundation/hardhat-network-helpers`, `@nomicfoundation/hardhat-node-test-runner`, `@nomicfoundation/hardhat-keystore`
- Removed old dependencies: `hardhat-deploy-ethers`, `hardhat-deploy-tenderly`, `@nomiclabs/hardhat-ethers`, `@typechain/hardhat`
- Updated Node.js requirement to `>= 22.0.0`

### 2. TypeScript Configuration

- Updated [`tsconfig.json`](tsconfig.json:1) for ESM (module: "node16", moduleResolution: "node16")
- Created [`scripts/tsconfig.json`](scripts/tsconfig.json:1) extending the main config
- Created [`test/tsconfig.json`](test/tsconfig.json:1) extending the main config

### 3. Rocketh Configuration

Created new rocketh configuration files:

- **[`rocketh/config.ts`](rocketh/config.ts:1)**: Contains named accounts configuration and extensions
  - Moved named accounts from hardhat.config.ts
  - Added signer protocols and extensions (@rocketh/deploy, @rocketh/read-execute, @rocketh/proxy, @rocketh/viem)
  - Exported TypeScript types for type safety

- **[`rocketh/deploy.ts`](rocketh/deploy.ts:1)**: Deploy script setup
  - Imports artifacts from generated directory
  - Exports `deployScript` function for deploy scripts

- **[`rocketh/environment.ts`](rocketh/environment.ts:1)**: Environment setup for tests/scripts
  - Exports `loadEnvironmentFromHardhat` for scripts
  - Exports `loadAndExecuteDeploymentsFromFiles` for tests

### 4. Hardhat Configuration

Updated [`hardhat.config.ts`](hardhat.config.ts:1):
- Changed from CommonJS to ESM imports
- Imported `HardhatDeploy` from 'hardhat-deploy' (default import)
- Removed `namedAccounts` section (moved to rocketh/config.ts)
- Converted solidity config to use profiles (default, production, uniswap, dai)
- Added `plugins` array with all required Hardhat 3.x plugins
- Used helper functions from `hardhat-deploy/helpers` for network configuration
- Added `generateTypedArtifacts` configuration
- Removed old `typechain`, `mocha`, and `external` configurations
- Removed network-specific configurations (now handled by helper functions)

### 5. Deploy Scripts Migration

Converted all 13 deploy scripts in [`deploy_l2/`](deploy_l2/) directory to v2 format:

**Key changes in deploy scripts:**
1. Changed imports from `HardhatRuntimeEnvironment` to `deployScript, artifacts` from `rocketh/deploy.js`
2. Wrapped deploy functions in `deployScript()` call
3. Changed parameter from `(hre)` to `(env)`
4. Replaced `hre.getNamedAccounts()` with direct `env.namedAccounts` access
5. Changed `from:` to `account:` in all deploy calls
6. Added explicit `artifact:` parameter to all deploy calls
7. Removed `log:` and `autoMine:` parameters
8. Moved tags and dependencies to second argument object
9. Converted proxy deployments to use `env.deployViaProxy()`
10. Updated `hre.network.live` to `env.tags.live`
11. Changed parseEther from ethers to viem
12. Updated contract interactions to use `env.read()` and `env.execute()`

**Converted scripts:**
- [`deploy_l2/01_play_tokens/01_deploy_play_token.ts`](deploy_l2/01_play_tokens/01_deploy_play_token.ts:1)
- [`deploy_l2/01_play_tokens/02_deploy_free_play_token.ts`](deploy_l2/01_play_tokens/02_deploy_free_play_token.ts:1)
- [`deploy_l2/01_play_tokens/03_deploy_free_play_token_claim.ts`](deploy_l2/01_play_tokens/03_deploy_free_play_token_claim.ts:1)
- [`deploy_l2/02_alliance_registry/01_deploy_alliance_registry.ts`](deploy_l2/02_alliance_registry/01_deploy_alliance_registry.ts:1)
- [`deploy_l2/03_outerspace/01_deploy_outer_space.ts`](deploy_l2/03_outerspace/01_deploy_outer_space.ts:1) - **Needs diamond pattern migration**
- [`deploy_l2/03_outerspace/02_deploy_conquest_credits.ts`](deploy_l2/03_outerspace/02_deploy_conquest_credits.ts:1)
- [`deploy_l2/03_outerspace/03_deploy_reward_generator.ts`](deploy_l2/03_outerspace/03_deploy_reward_generator.ts:1)
- [`deploy_l2/03_outerspace/04_deploy_brainless.ts`](deploy_l2/03_outerspace/04_deploy_brainless.ts:1)
- [`deploy_l2/03_outerspace/05_deploy_yakuza.ts`](deploy_l2/03_outerspace/05_deploy_yakuza.ts:1)
- [`deploy_l2/04_setup/01_setup_free_play_token.ts`](deploy_l2/04_setup/01_setup_free_play_token.ts:1)
- [`deploy_l2/10_agent_service/01_fund_agent_service_account.ts`](deploy_l2/10_agent_service/01_fund_agent_service_account.ts:1)
- [`deploy_l2/10_agent_service/04_deploy_payment_gateway.ts`](deploy_l2/10_agent_service/04_deploy_payment_gateway.ts:1)
- [`deploy_l2/10_agent_service/05_deploy_payment_withdrawal_gateway.ts`](deploy_l2/10_agent_service/05_deploy_payment_withdrawal_gateway.ts:1)
- [`deploy_l2/10_agent_service/06_set_withdrawal_gateway.ts`](deploy_l2/10_agent_service/06_set_withdrawal_gateway.ts:1)
- [`deploy_l2/20_basic_alliances/05_deploy_basic_alliance_factory.ts`](deploy_l2/20_basic_alliances/05_deploy_basic_alliance_factory.ts:1)
- [`deploy_l2/30_plugins/001_deploy_basic_spaceships_market.ts`](deploy_l2/30_plugins/001_deploy_basic_spaceships_market.ts:1)

### 6. Scripts Updated

Updated package.json scripts to use new hardhat-deploy v2 commands:
- Removed `hardhat typechain` (artifacts generated automatically)
- Updated test command to use `hardhat test`
- Removed `_scripts.js` patterns
- Added watch commands using `as-soon`
- Added `typescript` script for TypeScript compilation

## Remaining Work

### 1. Diamond Deployment Migration

The [`deploy_l2/03_outerspace/01_deploy_outer_space.ts`](deploy_l2/03_outerspace/01_deploy_outer_space.ts:1) script uses the v1 diamond deployment pattern with `diamond.deploy()`. This needs to be migrated to the v2 rocketh diamond pattern. The migration will require:

- Understanding the v2 diamond deployment API from rocketh
- Adapting the facets configuration
- Converting the diamond.deploy() call to the new pattern

**Status**: Placeholder created with console.log noting the need for manual migration

### 2. Test Files Migration

The test files in the [`test/`](test/) directory still use the v1 pattern and need to be updated:
- Change test runner from mocha to `node:test` (or keep mocha if preferred)
- Update assertion library imports
- Create custom fixture functions using `loadAndExecuteDeploymentsFromFiles()`
- Replace `deployments.createFixture()` with custom fixtures
- Import ABI types from generated artifacts
- Replace `ethers.getContract()` with `env.get<Abi_Type>()`
- Replace `getUnnamedAccounts()` with `env.unnamedAccounts`
- Convert contract method calls to `env.execute()`

**Status**: Not started

### 3. Scripts and Utilities

The [`_scripts.js`](_scripts.js:1) file uses v1 patterns and needs to be updated or replaced with rocketh commands:
- `rocketh-verify` for contract verification
- `rocketh-export` for deployment exports
- Update fork commands to use new environment variables

**Status**: Not started

### 4. Delete utils/network.ts

The [`utils/network.ts`](utils/network.ts:1) file is no longer needed in v2 as network configuration is handled by the helper functions from `hardhat-deploy/helpers`.

**Status**: Pending

### 5. Test Utilities

The test utilities in [`test/test-utils.ts`](test/test-utils.ts) and [`test/chai-setup.ts`](test/chai-setup.ts) need to be updated to work with the new environment pattern.

**Status**: Not started

### 6. Proxied.sol Import Update

If any contracts import `Proxied.sol` from hardhat-deploy, update the import path:
- Old: `import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";`
- New: `import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";`

**Status**: Needs verification

## Testing

After completing the migration, you should:

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Compile contracts:
   ```bash
   pnpm compile
   ```

3. Deploy to local network:
   ```bash
   pnpm deploy:dev
   ```

4. Run tests:
   ```bash
   pnpm test
   ```

5. Test on specific network:
   ```bash
   pnpm deploy sepolia
   ```

## Breaking Changes

1. **ESM Only**: The project now uses ESM modules. All imports must use `.js` extensions for local files.

2. **Hardhat 3.x**: Requires Node.js 22+ and Hardhat 3.x.

3. **Named Accounts**: Moved from hardhat.config.ts to rocketh/config.ts.

4. **Deploy Scripts**: All deploy scripts must use the new `deployScript()` pattern.

5. **Network Configuration**: Uses helper functions from `hardhat-deploy/helpers` instead of manual configuration.

6. **Environment Variables**: Network configuration now uses environment variables like `ETH_NODE_URI_<NETWORK>` and `MNEMONIC_<NETWORK>`.

7. **Artifacts**: Generated artifacts are in `generated/` directory instead of `typechain/`.

## Resources

- [hardhat-deploy v2 Documentation](https://rocketh.dev/hardhat-deploy/)
- [Migration from v1 Guide](https://github.com/wighawag/hardhat-deploy/blob/master/documentation/how-to/migration-from-v1.md)
- [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) - Complete working example using v2
- [Rocketh Documentation](https://github.com/wighawag/rocketh)