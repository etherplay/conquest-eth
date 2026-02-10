import {z} from 'zod';
import {createTool} from '../tool-handling/types.js';
import type {ConquestEnv} from '../types.js';

const schema = z.object({
	center: z.object({x: z.number(), y: z.number()}).describe('Center point coordinates {x, y}'),
	radius: z
		.number()
		.min(1)
		.max(50)
		.describe('Radius in distance units to search around the center point (1-50)'),
	only: z
		.string()
		.optional()
		.describe('Filter by owner: use "me" for current wallet address, or provide an address'),
});

export const get_planets_around = createTool<typeof schema, ConquestEnv>({
	description:
		'Get planets around a specific location within a certain radius. Useful for finding targets for fleet movement. Use the "only" parameter to filter by owner.',
	schema,
	execute: async (env, {center, radius, only}) => {
		try {
			let planets = await env.planetManager.getPlanetsAround(center.x, center.y, radius);

			// Filter by owner if 'only' parameter is provided
			if (only) {
				let filterAddress: string;
				if (only.toLowerCase() === 'me') {
					// Require wallet client for 'me' filter
					const walletClient = env.clients.walletClient;
					if (!walletClient?.account) {
						return {
							success: false,
							error:
								'Wallet client with account required to use "me" filter. Private key must be set.',
						};
					}
					filterAddress = walletClient.account.address.toLowerCase();
				} else {
					filterAddress = only.toLowerCase();
				}

				planets = planets.filter(({state}) => state.owner?.toLowerCase() === filterAddress);
			}

			return {
				success: true,
				result: {
					center: {
						x: center.x,
						y: center.y,
					},
					radius,
					...(only && {filter: {only}}),
					planets: planets.map(({info, state}) => ({
						planetId: info.location.id,
						distance: Math.sqrt(
							Math.pow(info.location.x - center.x, 2) + Math.pow(info.location.y - center.y, 2),
						),
						location: info.location,
						state,
						stats: info.stats,
						// ...state,
					})),
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
