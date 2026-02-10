import {Abi_FreePlayToken} from '../../generated/abis/FreePlayToken.js';
import {Abi_PlayToken} from '../../generated/abis/PlayToken.js';
import {Abi_TokenDistributor} from '../../generated/abis/TokenDistributor.js';
import {deployScript} from '../../rocketh/deploy.js';

const MAX_ALLOWANCE = 2n ** 256n - 1n;

export default deployScript(
	async (env) => {
		const {tokenBeneficiary} = env.namedAccounts;

		const TokenDistributor = env.get<Abi_TokenDistributor>('TokenDistributor');
		const PlayToken = env.get<Abi_PlayToken>('PlayToken');
		const FreePlayToken = env.get<Abi_FreePlayToken>('FreePlayToken');

		const freePlayTokenAllowance = await env.read(FreePlayToken, {
			functionName: 'allowance',
			args: [tokenBeneficiary, TokenDistributor.address],
		});

		if (freePlayTokenAllowance != MAX_ALLOWANCE) {
			await env.execute(FreePlayToken, {
				account: tokenBeneficiary,
				functionName: 'approve',
				args: [TokenDistributor.address, MAX_ALLOWANCE],
			});
		}

		const playTokenAllowance = await env.read(PlayToken, {
			functionName: 'allowance',
			args: [tokenBeneficiary, TokenDistributor.address],
		});

		if (playTokenAllowance != MAX_ALLOWANCE) {
			await env.execute(PlayToken, {
				account: tokenBeneficiary,
				functionName: 'approve',
				args: [TokenDistributor.address, MAX_ALLOWANCE],
			});
		}
	},
	{
		tags: ['TokenDistributor', 'TokenDistributor_setup'],
		dependencies: [
			'TokenDistributor_deploy',
			'FreePlayToken_deploy',
			'PlayToken_deploy',
		],
	},
);
