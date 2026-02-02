import type {EthereumProvider} from 'hardhat/types/providers';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {SpaceInfo} from 'conquest-eth-common';
import {parseEther} from 'viem';

// Import ABIs
import type {Abi_PaymentGateway} from '../../generated/abis/PaymentGateway.js';
import type {Abi_PaymentWithdrawalGateway} from '../../generated/abis/PaymentWithdrawalGateway.js';



export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeploymentsFromFiles({
				provider: provider,
			});

			// Get deployments
			const PaymentGateway = env.get<Abi_PaymentGateway>('PaymentGateway');
			const PaymentWithdrawalGateway = env.get<Abi_PaymentWithdrawalGateway>(
				'PaymentWithdrawalGateway',
			);
			const OuterSpace = env.get('OuterSpace');
			const AllianceRegistry = env.get('AllianceRegistry');
			const BasicAllianceFactory = env.get('BasicAllianceFactory');
			const BasicSpaceshipMarket = env.get('BasicSpaceshipMarket');
			const BrainLess = env.get('BrainLess');
			const ConquestCredits = env.get('ConquestCredits'); // This is the ConquestToken
			const FreePlayTokenClaim = env.get('FreePlayTokenClaim');
			const FreePlayToken = env.get('FreePlayToken');
			const PlayToken = env.get('PlayToken');
			const RewardsGenerator = env.get('RewardsGenerator');
			const Yakuza = env.get('Yakuza');

			// Distribute tokens to players
			const {claimKeyDistributor} = env.namedAccounts;
			const unnamedAccounts = env.unnamedAccounts;
			const distribution = [1000n, 500n, 3000n, 100n];
			for (let i = 0; i < distribution.length; i++) {
				const account = unnamedAccounts[i];
				const amount = distribution[i];
				await env.execute(ConquestCredits, {
					account: claimKeyDistributor,
					functionName: 'transfer',
					args: [account, parseEther(String(amount))],
				});
			}

			// Get OuterSpace deployment for linked data
			const linkedData = OuterSpace.linkedData;
			if (!linkedData) {
				throw new Error('OuterSpace deployment missing linkedData');
			}
			// Cast linkedData to the expected SpaceInfo constructor type
			const spaceInfo = new SpaceInfo(linkedData as any);

			return {
				env,
				OuterSpace,
				AllianceRegistry,
				BasicAllianceFactory,
				BasicSpaceshipMarket,
				BrainLess,
				ConquestCredits, // This is ConquestToken
				FreePlayTokenClaim,
				FreePlayToken,
				PlayToken,
				RewardsGenerator,
				Yakuza,
				spaceInfo,
				PaymentGateway,
				PaymentWithdrawalGateway,
				namedAccounts: env.namedAccounts,
				unnamedAccounts: env.unnamedAccounts,
			};
		},
	};
}
