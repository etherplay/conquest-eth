import {z} from 'zod';
import {formatEther} from 'viem';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	address: z
		.string()
		.optional()
		.describe('Address to check balance for. Defaults to current wallet if private key is available.'),
});

export const get_native_token_balance = createTool<typeof schema, ConquestEnv>({
	description:
		'Get the native token (ETH) balance for an address. If no address provided, uses the current wallet address.',
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

			const balanceWei = await env.clients.publicClient.getBalance({
				address: targetAddress,
			});

			const balanceEth = formatEther(balanceWei);

			return {
				success: true,
				result: {
					address: targetAddress,
					balance: `${balanceEth} ETH`,
					balanceWei: balanceWei.toString(),
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
