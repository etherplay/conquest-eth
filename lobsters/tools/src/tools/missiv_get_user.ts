import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	address: z.string().describe('address'),
});

export const missiv_get_user = createTool<typeof schema, ConquestEnv>({
	description: 'get User details from address',
	schema,
	execute: async (env, {address}) => {
		try {
			const body = JSON.stringify({
				type: 'getUser',
				domain: 'conquest.eth',
				address: address.toLowerCase(),
			});

			const headers = {
				'content-type': 'application/json',
			};

			const url = `https://api-conquest-2025-1.missiv.xyz/api/user/getCompleteUser`;

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
					result: json as {
						completeUser: {
							user: `0x${string}`;
							domain: string;
							domainUsername?: string;
							domainDescription?: string;
							publicKey: `0x${string}`;
							signature: `0x${string}`;
							added: number;
							lastPresence: number;
							address: `0x${string}`;
							name?: string;
							description?: string;
							created: number;
						};
					},
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
