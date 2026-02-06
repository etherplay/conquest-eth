import {Deployment} from 'rocketh/types';
import {Abi_ConquestCredits} from '../../generated/abis/ConquestCredits.js';
import {Abi_IOuterSpace} from '../../generated/abis/IOuterSpace.js';
import {Abi_OuterSpaceAdminFacet} from '../../generated/abis/OuterSpaceAdminFacet.js';
import {Abi_RewardsGenerator} from '../../generated/abis/RewardsGenerator.js';
import {deployScript, artifacts} from '../../rocketh/deploy.js';

export default deployScript(
	async (env) => {
		const networkName = await env.name;
		const {deployer} = env.namedAccounts;

		const ConquestCredits = env.get<Abi_ConquestCredits>('ConquestCredits');
		const OuterSpace = env.get<Abi_IOuterSpace>('OuterSpace');
		const gamesToEnable = [OuterSpace.address];

		const accountsToInitialise: {account: `0x${string}`; amount: bigint}[] = [];

		// Disabled first
		let rewardRateMillionth = 0n;
		let fixedRewardRateThousandsMillionth = 0n;

		if (networkName === 'localhost') {
			// will be upgraded with these parameters:
			// rewardRateMillionth = 100; // 100 for every million of second. or 8.64 / day
			// fixedRewardRateThousandsMillionth = 10; // 10 for every  thousand million of seconds, or 0.000864 per day per stake or 315.36 / year / 1000 stake
		}

		if (networkName === '2025_1') {
			// will be upgraded with these parameters:
			rewardRateMillionth = 100n; // 100 for every million of second. or 8.64 / day
			fixedRewardRateThousandsMillionth = 10n; // 10 for every  thousand million of seconds, or 0.000864 per day per stake or 315.36 / year / 1000 stake
		}

		const timestamp = Math.floor(Date.now() / 1000);
		const ExistingRewardsGenerator =
			env.getOrNull<Abi_RewardsGenerator>('RewardsGenerator');
		if (ExistingRewardsGenerator) {
			const existing_rewardRateMillionth = await env.read(
				ExistingRewardsGenerator,
				{
					functionName: 'REWARD_RATE_millionth',
					args: [],
				},
			);
			const existing_fixedRewardRateThousandsMillionth = await env.read(
				ExistingRewardsGenerator,
				{
					functionName: 'FIXED_REWARD_RATE_thousands_millionth',
					args: [],
				},
			);

			if (
				existing_fixedRewardRateThousandsMillionth !=
					fixedRewardRateThousandsMillionth ||
				existing_rewardRateMillionth != rewardRateMillionth
			) {
				if (
					existing_fixedRewardRateThousandsMillionth == 0n &&
					existing_rewardRateMillionth == 0n
				) {
					console.log(`RewardsGenerator parameters changed, updating`);
					const lastUpdate = await env.read(ExistingRewardsGenerator, {
						functionName: 'lastUpdated',
						args: [],
					});
					if (timestamp - Number(lastUpdate) > 1 * 60) {
						await env.execute(ExistingRewardsGenerator, {
							account: deployer as `0x${string}`,
							functionName: 'update',
							args: [],
						});
					}
				} else {
					console.log(`do not update as it is non-zero`);
				}
			}
		}

		const RewardsGenerator = await env.deployViaProxy(
			'RewardsGenerator',
			{
				account: deployer as `0x${string}`,
				artifact: artifacts.RewardsGenerator,
				args: [
					ConquestCredits.address,
					{
						rewardRateMillionth,
						fixedRewardRateThousandsMillionth,
					},
					gamesToEnable,
					accountsToInitialise,
				],
			},
			{
				proxyDisabled: false,
				execute: 'postUpgrade',
				linkedData: {
					rewardRateMillionth,
					fixedRewardRateThousandsMillionth,
				},
			},
		);

		const OuterSpaceAdmin =
			OuterSpace as unknown as Deployment<Abi_OuterSpaceAdminFacet>;

		const currentGeneratorAdmin = await env.read(OuterSpaceAdmin, {
			functionName: 'generatorAdmin',
			args: [],
		});
		if (
			currentGeneratorAdmin.toLowerCase() !== (deployer as string).toLowerCase()
		) {
			await env.execute(OuterSpaceAdmin, {
				account: deployer as `0x${string}`,
				functionName: 'setGeneratorAdmin',
				args: [deployer],
			});
		}

		const currentGenerator = await env.read(OuterSpaceAdmin, {
			functionName: 'generator',
			args: [],
		});
		if (
			currentGenerator.toLowerCase() !== RewardsGenerator.address.toLowerCase()
		) {
			await env.execute(OuterSpaceAdmin, {
				account: deployer as `0x${string}`,
				functionName: 'setGenerator',
				args: [RewardsGenerator.address],
			});
		}
	},
	{
		tags: ['RewardsGenerator', 'RewardsGenerator_deploy'],
		dependencies: ['ConquestCredits_deploy', 'OuterSpace_deploy'],
	},
);
