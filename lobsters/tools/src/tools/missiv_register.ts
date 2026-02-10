import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';
import {signAsync} from '@noble/secp256k1';
import {keccak_256} from '@noble/hashes/sha3';
import {computePublicKey} from '@ethersproject/signing-key';

const chainNames: {[chainId: string]: string} = {
	'1': 'mainnet',
	'3': 'ropsten',
	'4': 'rinkeby',
	'5': 'goerli',
	'42': 'kovan',
	'100': 'Gnosis Chain',
	'1337': 'localhost chain',
	'31337': 'localhost chain',
	'7001': 'ZetaChain Testnet',
	'7000': 'ZetaChain',
	'42220': 'celo',
	'11142220': 'celo-sepolia',
	'143': 'monad',
	'10143': 'monad-testnet',
};
function nameForChainId(chainId: string): string {
	const name = chainNames[chainId];
	if (name) {
		return name;
	}
	return `chain with id ${chainId}`;
}

const schema = z.object({
	bio: z
		.string()
		.describe(
			'Describe who you are very briefly and how you can be reached (moltbook account, etc..)',
		),
});

function publicKeyAuthorizationMessage({
	address,
	publicKey,
}: {
	address: string;
	publicKey: string;
}): string {
	return `I authorize the following Public Key to represent me:\n ${publicKey}\n\n  Others can use this key to write me messages`;
}

export const missiv_register = createTool<typeof schema, ConquestEnv>({
	description:
		'Register on Missiv so other can identify you. You can advertise your moltbook account here so other can send messages to you',
	schema,
	execute: async (env, {bio}) => {
		if (!env.clients.walletClient || env.clients.walletClient.account === undefined) {
			throw new Error(
				'Wallet client is required for this operation. Please provide a PRIVATE_KEY environment variable.',
			);
		}

		const chainId = await env.clients.publicClient.getChainId();
		const chainName = nameForChainId(chainId.toString());
		const message = `Only sign this message on "conquest.eth" or other trusted frontend.\nThis is for ${chainName}`;
		const accountAddress = env.clients.walletClient.account.address.toLowerCase() as `0x${string}`;
		const signatureToCreateDelegate = await env.clients.walletClient.signMessage({
			account: accountAddress,
			message,
		});
		const missivPrivateKey = signatureToCreateDelegate.slice(0, 66) as `0x${string}`;

		const publicKey = computePublicKey(missivPrivateKey, true);
		const signatureToAssociatePublicKeyToAccount = await env.clients.walletClient.signMessage({
			account: accountAddress,
			message: publicKeyAuthorizationMessage({address: accountAddress, publicKey}),
		});
		const action = {
			type: 'register',
			address: accountAddress,
			domain: 'conquest.eth',
			signature: signatureToAssociatePublicKeyToAccount,
			domainDescription: bio,
		};

		try {
			const body = JSON.stringify(action);
			const requestSignature = await signAsync(keccak_256(body), missivPrivateKey.slice(2)); // Sync methods below

			const headers = {
				'content-type': 'application/json',
				SIGNATURE: `${requestSignature.toCompactHex()}:${requestSignature.recovery}`,
			};

			const url = `https://api-conquest-2025-1.missiv.xyz/api/user/register`;

			const resp = await fetch(url, {
				method: 'POST',
				body,
				headers,
			});
			if (resp.status !== 200 && resp.status !== 201) {
				const text = await resp.text();
				console.error(`failed`, text);
				throw new Error(text);
			}
			if (resp) {
				const json = await resp.json();
				return {
					success: true,
					result: json as any, // TODO,
				};
			} else {
				console.error(`failed with no response`);
				throw new Error(`no response`);
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},
});
