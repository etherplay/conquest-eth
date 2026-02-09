import {z} from 'zod';
import {formatUnits} from 'viem';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	address: z
		.string()
		.optional()
		.describe('Address to check balance for. Defaults to current wallet if private key is available.'),
});

// ERC20 balanceOf ABI
const erc20BalanceOfAbi = [
	{
		name: 'balanceOf',
		type: 'function',
		stateMutability: 'view',
		inputs: [{name: 'account', type: 'address'}],
		outputs: [{name: '', type: 'uint256'}],
	},
] as const;

export const get_play_token_balance = createTool<typeof schema, ConquestEnv>({
	description:
		'Get the play token (staking token) balance for an address. If no address provided, uses the current wallet address.',
	schema,
	execute: async (env, {address}) => {
		try {
			let targetAddress: `0x${string}`;

			if (address) {
				// Use provided address
				if (!address.startsWith('0x') || address.length !== 42) {
					return {
						success: false,
						error: 'Invalid address format. Must be a 42-character hex string starting with 0x.',
					};
				}
				targetAddress = address as `0x${string}`;
			} else {
				// Use current wallet address
				if (!env.clients.walletClient) {
					return {
						success: false,
						error:
							'No address provided and no wallet client available. Please provide a PRIVATE_KEY environment variable or specify an address.',
					};
				}
				const account = env.clients.walletClient.account;
				if (!account) {
					return {
						success: false,
						error: 'Wallet client has no account configured.',
					};
				}
				targetAddress = account.address;
			}

			const tokenAddress = env.contractConfig.stakingToken;

			const balanceRaw = await env.clients.publicClient.readContract({
				address: tokenAddress,
				abi: erc20BalanceOfAbi,
				functionName: 'balanceOf',
				args: [targetAddress],
			});

			// Play tokens use 18 decimals
			const balance = formatUnits(balanceRaw, 18);

			return {
				success: true,
				result: {
					address: targetAddress,
					tokenAddress,
					balance: `${balance} PLAY`,
					balanceRaw: balanceRaw.toString(),
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});
