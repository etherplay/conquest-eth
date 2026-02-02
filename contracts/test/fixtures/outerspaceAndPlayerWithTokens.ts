// Fixture for setting up OuterSpace with players and tokens
import {createFixture} from './index.js';
import {parseEther} from 'viem';
import type {Environment} from '../../rocketh/config.js';
import type {AllianceRegistry, BasicAlliance, ConquestToken} from '../../generated/artifacts/ConquestToken.js';
import {setupUsers} from '../utils/index.js';
import {SpaceInfo} from 'conquest-eth-common';

export type OuterSpacePlayerFixture = {
	env: Environment;
	players: ReturnType<typeof setupUsers> extends Promise<infer T> ? T : never;
	BasicAllianceFactory: any;
	AllianceRegistry: any;
	OuterSpace: any;
	ConquestToken: any;
	spaceInfo: SpaceInfo;
};

/**
 * Fixture that deploys all contracts and distributes tokens to players
 */
export const outerSpaceFixture = createFixture(async (): Promise<OuterSpacePlayerFixture> => {
	const env = await (await import('../../rocketh/environment.js')).loadAndExecuteDeploymentsFromFiles();
	const accounts = await env.accounts();
	const {claimKeyDistributor} = accounts.namedAccounts;
	const unNamedAccounts = accounts.unnamedAccounts;

	// Distribute tokens to players
	const distribution = [1000n, 500n, 3000n, 100n];
	for (let i = 0; i < distribution.length; i++) {
		const account = unNamedAccounts[i];
		const amount = distribution[i];
		await env.execute({
			account: claimKeyDistributor.address,
			contract: 'ConquestToken',
			functionName: 'transfer',
			args: [account.address, parseEther(String(amount))],
		});
	}

	// Get contracts
	const BasicAllianceFactory = await env.get('BasicAllianceFactory');
	const AllianceRegistry = await env.get('AllianceRegistry');
	const OuterSpace = await env.get('OuterSpace');
	const ConquestToken = await env.get('ConquestToken');

	// Get OuterSpace deployment for linked data
	const outerSpaceDeployment = await env.getDeployment('OuterSpace');
	const spaceInfo = new SpaceInfo(outerSpaceDeployment.linkedData);

	// Setup users with contracts
	const players = await setupUsers(
		unNamedAccounts,
		{
			BasicAllianceFactory,
			AllianceRegistry,
			OuterSpace,
			ConquestToken,
		},
		async (address) => env.getWalletClient(address),
	);

	return {
		env,
		players,
		BasicAllianceFactory,
		AllianceRegistry,
		OuterSpace,
		ConquestToken,
		spaceInfo,
	};
});