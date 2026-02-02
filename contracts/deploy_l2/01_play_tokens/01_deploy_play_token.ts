import {deployScript, artifacts} from '../../rocketh/deploy.js';
import {formatEther, parseEther, zeroAddress} from 'viem';

export default deployScript(
	async (env) => {
		const {deployer, playerAccount3, playerAccount4} = env.namedAccounts;

		const chainId = await env.viem.publicClient.getChainId();
		const networkName = await env.name;
		// TODO use network tags ?
		const localTesting =
			networkName === 'hardhat' || networkName === 'localhost'; // chainId === '1337' || chainId === '31337';

		let numTokensPerNativeTokenAt18Decimals = parseEther('1');

		if (
			localTesting ||
			networkName === 'sepolia' ||
			networkName === 'sepolia_fast' ||
			networkName === 'endurance_test'
		) {
			numTokensPerNativeTokenAt18Decimals = parseEther('1000');
		}

		if (networkName === 'defcon') {
			numTokensPerNativeTokenAt18Decimals = parseEther('1');
		}

		let WXDAI = (await env.getOrNull('WXDAI')) || {address: zeroAddress};
		let SDAI = (await env.getOrNull('SDAI')) || {address: zeroAddress};
		let SavingsXDaiAdapter = (await env.getOrNull('SavingsXDaiAdapter')) || {
			address: zeroAddress,
		};

		const PlayTokenBefore = await env.getOrNull('PlayToken');
		if (PlayTokenBefore) {
			const PlayTokenNativeBalamce = formatEther(
				await env.viem.publicClient.getBalance({
					address: PlayTokenBefore.address as `0x${string}`,
				}),
			);
			console.log({PlayTokenNativeBalamce});
		}

		const PlayToken = await env.deployViaProxy(
			'PlayToken',
			{
				account: deployer as `0x${string}`,
				artifact: artifacts.PlayToken,
				args: [
					deployer,
					numTokensPerNativeTokenAt18Decimals,
					SDAI.address,
					SavingsXDaiAdapter.address,
				],
			},
			{
				proxyDisabled: false,
				execute: 'postUpgrade',
				linkedData: {
					numTokensPerNativeTokenAt18Decimals:
						numTokensPerNativeTokenAt18Decimals.toString(),
				},
			},
		);

		{
			const PlayTokenNativeBalamce = formatEther(
				await env.viem.publicClient.getBalance({
					address: PlayToken.address as `0x${string}`,
				}),
			);
			console.log({PlayTokenNativeBalamce});
		}

		// console.log('========================================================');
		// console.log('========================================================');
		// console.log('========================================================');
		// console.log('========================================================');
		// console.log('========================================================');

		// const BridgeInterestReceiver = await get('BridgeInterestReceiver');

		// await execute('PlayToken', {from: deployer, log: true}, 'setRedeemer', deployer);

		// const x = -29;
		// const y = -12;
		// const location = xyToLocation(x, y);
		// const OuterSpace = await get('OuterSpace');
		// const spaceInfo = new SpaceInfo(OuterSpace.linkedData);
		// const planet = spaceInfo.getPlanetInfo(x, y) as PlanetInfo;
		// const stake = BigNumber.from(planet.stats.stake).mul('100000000000000');

		// await execute(
		//   'PlayToken',
		//   {from: playerAccount4, log: true, value: parseEther('12')},
		//   'mint',
		//   playerAccount4,
		//   parseEther('12')
		// );

		// await execute(
		//   'PlayToken',
		//   {from: playerAccount4, log: true},
		//   'transferAndCall',
		//   OuterSpace.address,
		//   stake,
		//   defaultAbiCoder.encode(['address', 'uint256'], [playerAccount4, location])
		// );

		// await increaseTime(24 * 3600);

		// console.log(`============       24 hours Later..       =========================`);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   const playerNativeBalance = formatEther(await hre.ethers.provider.getBalance(playerAccount4));
		//   console.log({nativeBalance, playerNativeBalance});
		// }

		// await execute('BridgeInterestReceiver', {from: deployer, log: true}, 'claim');

		// await execute('PlayToken', {from: deployer, log: true}, 'redeemInterest', deployer);

		// await execute('OuterSpace', {from: playerAccount4, log: true}, 'exitFor', playerAccount4, location);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   const playerNativeBalance = formatEther(await hre.ethers.provider.getBalance(playerAccount4));
		//   console.log({nativeBalance, playerNativeBalance});
		// }

		// await increaseTime(3 * 24 * 3600);

		// console.log(`============       3 days Later..       =========================`);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   const playerNativeBalance = formatEther(await hre.ethers.provider.getBalance(playerAccount4));
		//   console.log({nativeBalance, playerNativeBalance});
		// }

		// await execute('OuterSpace', {from: playerAccount4, log: true}, 'fetchAndWithdrawFor', playerAccount4, [location]);

		// await execute('PlayToken', {from: playerAccount4, log: true}, 'burn', playerAccount4, parseEther('12'));

		// await execute('BridgeInterestReceiver', {from: deployer, log: true}, 'claim');

		// await execute('PlayToken', {from: deployer, log: true}, 'redeemInterest', deployer);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   const playerNativeBalance = formatEther(await hre.ethers.provider.getBalance(playerAccount4));
		//   console.log({nativeBalance, playerNativeBalance});
		// }

		// await increaseTime(365 * 24 * 3600);

		// console.log(`============       1 year Later..       =========================`);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   console.log({nativeBalance});
		// }

		// // await execute('BridgeInterestReceiver', {from: deployer, log: true}, 'claim');

		// await execute('PlayToken', {from: deployer, log: true}, 'redeemInterest', deployer);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   console.log({nativeBalance});
		// }

		// await increaseTime(100 * 365 * 24 * 3600);

		// console.log(`============       100 years Later..       =========================`);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   console.log({nativeBalance});
		// }

		// // await execute('BridgeInterestReceiver', {from: deployer, log: true}, 'claim');

		// await execute('PlayToken', {from: deployer, log: true}, 'redeemInterest', deployer);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   console.log({nativeBalance});
		// }
		// await increaseTime(20000 * 365 * 24 * 3600);

		// console.log(`============       20,000 years Later..       =========================`);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   console.log({nativeBalance});
		// }

		// // await execute('BridgeInterestReceiver', {from: deployer, log: true}, 'claim');

		// await execute('PlayToken', {from: deployer, log: true}, 'redeemInterest', deployer);

		// {
		//   const nativeBalance = formatEther(await hre.ethers.provider.getBalance(deployer));
		//   console.log({nativeBalance});
		// }

		// {
		//   const SDAIBalance = formatEther(await read('SDAI', 'balanceOf', PlayToken.address));
		//   const maxWidthdraw = formatEther(await read('SDAI', 'maxWithdraw', PlayToken.address));
		//   console.log({SDAIBalance, maxWidthdraw});
		// }
	},
	{
		tags: ['PlayToken', 'PlayToken_deploy'],
	},
);
