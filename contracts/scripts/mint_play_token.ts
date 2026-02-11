import hre from 'hardhat';
import {loadEnvironmentFromHardhat} from '../rocketh/environment.js';
import {Abi_FreePlayToken} from '../generated/abis/FreePlayToken.js';
import {Abi_PlayToken} from '../generated/abis/PlayToken.js';

async function main(args: string[]) {
	if (args.length < 2) {
		throw new Error('Usage: mint_play_token.ts  <to> <amount>');
	}
	const to = args[0] as `0x${string}`;
	const amount = BigInt(args[1]) * 1000000000000000000n;

	const env = await loadEnvironmentFromHardhat({hre});
	const PlayToken = env.get<Abi_PlayToken>('PlayToken');

	const {deployer} = env.namedAccounts;

	const numTokensPerNativeTokenAt18Decimals = BigInt(
		(PlayToken.linkedData as any).numTokensPerNativeTokenAt18Decimals,
	);

	const value =
		numTokensPerNativeTokenAt18Decimals == 0n
			? 0n
			: (amount * 1000000000000000000n) / numTokensPerNativeTokenAt18Decimals;

	const mintReceipt = await env.execute(PlayToken, {
		account: deployer,
		functionName: 'mint',
		args: [to, amount],
		value,
	});

	console.log(mintReceipt);
}
main(process.argv.slice(2));
