import {Abi_IOuterSpace} from '../../generated/abis/IOuterSpace.js';
import {Abi_PlayToken} from '../../generated/abis/PlayToken.js';
import {Abi_RewardsGenerator} from '../../generated/abis/RewardsGenerator.js';
import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {parseEther} from 'viem';

export default deployScript(
	async (env) => {
		const {deployer} = env.namedAccounts;

		const OuterSpace = env.get<Abi_IOuterSpace>('OuterSpace');
		const PlayToken = env.get<Abi_PlayToken>('PlayToken');

		if (!PlayToken.linkedData?.numTokensPerNativeTokenAt18Decimals) {
			// we skip the deployment of Yakuza when external token for now as frontend require new handling
			return;
		}
		const RewardsGenerator = env.get<Abi_RewardsGenerator>('RewardsGenerator');

		const linkedData = OuterSpace.linkedData as any;

		//const numSecondsPerTokens = 259200; // 12$ gives you 36 days
		const numSecondsPerTokens = 302400n; // 2$ gives you 1 week
		const config = {
			genesis: linkedData.genesis,
			acquireNumSpaceships: linkedData.acquireNumSpaceships,
			productionCapAsDuration: linkedData.productionCapAsDuration,
			frontrunningDelay: linkedData.frontrunningDelay,
			timePerDistance: linkedData.timePerDistance,
			productionSpeedUp: linkedData.productionSpeedUp,

			minAttackAmount: 20000n,
			numSecondsPerTokens,
			spaceshipsToKeepPer10000: 1500n, // 15% of cap to keep
			minAverageStakePerPlanet: parseEther('1'), // 1 tokens per planet on average minimum, do mot accept low planet unless bigger are given too
			maxClaimDelay: BigInt(
				Math.floor((1 * 24 * 60 * 60) / linkedData.productionSpeedUp),
			), // 1 day
			minimumSubscriptionWhenNotStaking: parseEther('1'),
			minimumSubscriptionWhenStaking: parseEther('1'),
			maxTimeRange: BigInt(
				Math.floor((5 * 24 * 60 * 60) / linkedData.productionSpeedUp),
			), // 5 days
		};

		// console.log(config);
		await env.deployViaProxy(
			'Yakuza',
			{
				account: deployer as `0x${string}`,
				artifact: artifacts.Yakuza,
				args: [
					deployer,
					RewardsGenerator.address,
					OuterSpace.address,
					PlayToken.address,
					config,
				],
			},
			{
				proxyDisabled: false,
				execute: 'postUpgrade',
				linkedData: config,
			},
		);
	},
	{
		tags: ['Yakuza', 'Yakuza_deploy'],
		dependencies: ['RewardsGenerator_deploy'],
	},
);
