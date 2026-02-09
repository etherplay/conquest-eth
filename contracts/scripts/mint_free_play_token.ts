import hre from 'hardhat';
import {loadEnvironmentFromHardhat} from '../rocketh/environment.js';
import {Abi_FreePlayToken} from '../generated/abis/FreePlayToken.js';
import {Abi_PlayToken} from '../generated/abis/PlayToken.js';

async function main(args: string[]) {
	if (args.length < 1) {
		throw new Error('Usage: mint_free_play_token.ts <amount>');
	}
	const amount = BigInt(args[0]) * 1000000000000000000n;
	const env = await loadEnvironmentFromHardhat({hre});
	const PlayToken = env.get<Abi_PlayToken>('PlayToken');
	const FreePlayToken = env.get<Abi_FreePlayToken>('FreePlayToken');

	const {tokenBeneficiary} = env.namedAccounts;

	const approveReceipt = await env.execute(PlayToken, {
		account: tokenBeneficiary,
		functionName: 'approve',
		args: [FreePlayToken.address, amount],
	});

	console.log(approveReceipt);

	const mintReceipt = await env.execute(FreePlayToken, {
		account: tokenBeneficiary,
		functionName: 'mint',
		args: [tokenBeneficiary, tokenBeneficiary, amount],
	});

	console.log(mintReceipt);
}
main(process.argv.slice(2));
