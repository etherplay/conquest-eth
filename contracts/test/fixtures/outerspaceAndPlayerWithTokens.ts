// Fixture for setting up OuterSpace with players and tokens
import type {Environment} from '../../rocketh/config.js';
import {SpaceInfo} from 'conquest-eth-common';
import {parseEther} from 'viem';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';

export type OuterSpacePlayerFixture = {
	env: Environment;
	namedAccounts: Record<string, `0x${string}`>;
	unnamedAccounts: `0x${string}`[];
	BasicAllianceFactory: {address: `0x${string}`};
	AllianceRegistry: {address: `0x${string}`};
	OuterSpace: {address: `0x${string}`};
	ConquestToken: {address: `0x${string}`};
	spaceInfo: SpaceInfo;
};

/**
 * Setup fixture for Outerspace tests - must be called with provider from test
 */
export async function setupOuterSpaceFixture(provider: any): Promise<OuterSpacePlayerFixture> {
	const env = await loadAndExecuteDeploymentsFromFiles({provider});
	const {claimKeyDistributor} = env.namedAccounts;
	const unnamedAccounts = env.unnamedAccounts;

	// Distribute tokens to players
	const distribution = [1000n, 500n, 3000n, 100n];
	for (let i = 0; i < distribution.length; i++) {
		const account = unnamedAccounts[i];
		const amount = distribution[i];
		const ConquestToken = env.get('ConquestToken');
		await env.execute(ConquestToken, {
			account: claimKeyDistributor,
			functionName: 'transfer',
			args: [account, parseEther(String(amount))],
		});
	}

	// Get deployments
	const BasicAllianceFactory = env.get('BasicAllianceFactory');
	const AllianceRegistry = env.get('AllianceRegistry');
	const OuterSpace = env.get('OuterSpace');
	const ConquestToken = env.get('ConquestToken');

	// Get OuterSpace deployment for linked data
	const outerSpaceDeployment = env.getDeployment('OuterSpace');
	const spaceInfo = new SpaceInfo(outerSpaceDeployment.linkedData);

	return {
		env,
		namedAccounts: env.namedAccounts,
		unnamedAccounts,
		BasicAllianceFactory,
		AllianceRegistry,
		OuterSpace,
		ConquestToken,
		spaceInfo,
	};
}