import type {EthereumProvider} from 'hardhat/types/providers';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {SpaceInfo} from 'conquest-eth-common';
import {Abi, parseEther} from 'viem';

// Import ABIs
import type {Abi_PaymentGateway} from '../../generated/abis/PaymentGateway.js';
import type {Abi_PaymentWithdrawalGateway} from '../../generated/abis/PaymentWithdrawalGateway.js';
import {Abi_BasicAlliance} from '../../generated/abis/BasicAlliance.js';
import {Abi_AllianceRegistry} from '../../generated/abis/AllianceRegistry.js';
import {Abi_BasicSpaceshipMarket} from '../../generated/abis/BasicSpaceshipMarket.js';
import {Abi_BrainLess} from '../../generated/abis/BrainLess.js';
import {Abi_ConquestCredits} from '../../generated/abis/ConquestCredits.js';
import {Abi_FreePlayToken} from '../../generated/abis/FreePlayToken.js';
import {Abi_FreePlayTokenClaim} from '../../generated/abis/FreePlayTokenClaim.js';
import {Abi_PlayToken} from '../../generated/abis/PlayToken.js';
import {Abi_RewardsGenerator} from '../../generated/abis/RewardsGenerator.js';
import {Abi_Yakuza} from '../../generated/abis/Yakuza.js';
import {Abi_IOuterSpace} from '../../generated/abis/IOuterSpace.js';

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
			const OuterSpace = env.get<Abi_IOuterSpace>('OuterSpace');
			const AllianceRegistry =
				env.get<Abi_AllianceRegistry>('AllianceRegistry');
			const BasicAllianceFactory = env.get<Abi_BasicAlliance>(
				'BasicAllianceFactory',
			);
			const BasicSpaceshipMarket = env.get<Abi_BasicSpaceshipMarket>(
				'BasicSpaceshipMarket',
			);
			const BrainLess = env.get<Abi_BrainLess>('BrainLess');
			const ConquestCredits = env.get<Abi_ConquestCredits>('ConquestCredits'); // This is the ConquestToken
			const FreePlayTokenClaim =
				env.get<Abi_FreePlayTokenClaim>('FreePlayTokenClaim');
			const FreePlayToken = env.get<Abi_FreePlayToken>('FreePlayToken');
			const PlayToken = env.get<Abi_PlayToken>('PlayToken');
			const RewardsGenerator =
				env.get<Abi_RewardsGenerator>('RewardsGenerator');
			const Yakuza = env.get<Abi_Yakuza>('Yakuza');

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
