// Outerspace test utilities using viem and env API
import {keccak256, encodeAbiParameters} from 'viem';
import type {SpaceInfo} from 'conquest-eth-common';
import type {PlanetInfo} from 'conquest-eth-common/';

export type PlanetState = PlanetInfo & {
	state: any;
	getNumSpaceships: (time: bigint) => number;
};

/**
 * Convert planet call data from contract to JS types
 */
export function convertPlanetCallData(
	o: string | number | bigint,
): string | number {
	if (typeof o === 'number') {
		return o;
	}
	if (typeof o === 'string') {
		return o;
	}
	if (typeof o === 'bigint') {
		if (o >= -2147483647n && o <= 2147483647n) {
			return Number(o);
		}
		return o.toString();
	}
	return String(o);
}

export async function fetchPlanetState(
	env: any,
	OuterSpace: any,
	planet: PlanetInfo,
): Promise<PlanetState> {
	const planetData = await env.read(OuterSpace, {
		functionName: 'getPlanet',
		args: [planet.location.id],
	});
	const statsFromContract = Object.fromEntries(
		Object.entries(planet.stats).map(([key, value]) => [
			key,
			convertPlanetCallData((planetData.stats as any)[key]),
		]),
	);

	// Check validity assertion
	for (const key of Object.keys(statsFromContract)) {
		const value = statsFromContract[key];
		if (value !== (planet as any).stats[key]) {
			throw new Error(
				`${key}: ${(planet as any).stats[key]} not equal to contract stats : ${value} `,
			);
		}
	}

	const state = Object.fromEntries(
		Object.entries((planetData as any).state).map(([key, value]) => [
			key,
			convertPlanetCallData(value as any),
		]),
	);

	return {
		...planet,
		state,
		getNumSpaceships(time: bigint) {
			let newSpaceships = 0;
			const lastUpdated = BigInt(state.lastUpdated);
			if (time > lastUpdated) {
				console.log({
					time,
					lastUpdated,
					numSpaceships: state.numSpaceships,
					production: planet.stats.production,
				});
				const timeDiff = Number(time - lastUpdated);
				newSpaceships = Math.floor((timeDiff * planet.stats.production) / 3600);
			}
			return Number(state.numSpaceships) + newSpaceships;
		},
	};
}

/**
 * Acquire a virgin planet for a player using env API
 */
export async function acquire(
	env: any,
	OuterSpace: any,
	ConquestToken: any,
	playerAddress: `0x${string}`,
	planet: PlanetInfo,
): Promise<`0x${string}`> {
	const amount = BigInt(planet.stats.stake) * 1000000000000000000n;
	const hash = await env.execute(ConquestToken, {
		functionName: 'transferAndCall',
		args: [
			OuterSpace.address,
			amount,
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}],
				[playerAddress, BigInt(planet.location.id)],
			),
		],
		account: playerAddress,
	});
	return hash;
}

/**
 * Send fleets in secret to a destination planet
 */
export async function sendInSecret(
	env: any,
	OuterSpace: any,
	spaceInfo: SpaceInfo,
	playerAddress: `0x${string}`,
	{
		from,
		quantity,
		to,
	}: {from: PlanetInfo; quantity: number; to: PlanetInfo},
): Promise<{
	hash: `0x${string}`;
	timeRequired: number;
	distance: number;
	fleetId: string;
	from: string;
	to: string;
	secret: string;
}> {
	// Use viem's generatePrivateKey equivalent from viem/accounts
	const {generatePrivateKey} = await import('viem/accounts');
	const secret = generatePrivateKey();
	const toHash = keccak256(
		encodeAbiParameters(
			[{type: 'bytes32'}, {type: 'uint256'}],
			[secret, BigInt(to.location.id)],
		),
	);
	const fleetId = keccak256(
		encodeAbiParameters(
			[{type: 'bytes32'}, {type: 'uint256'}],
			[toHash, BigInt(from.location.id)],
		),
	);

	const hash = await env.execute(OuterSpace, {
		functionName: 'send',
		args: [BigInt(from.location.id), BigInt(quantity), toHash],
		account: playerAddress,
	});

	const distanceSquared =
		Math.pow(to.location.globalX - from.location.globalX, 2) +
		Math.pow(to.location.globalY - from.location.globalY, 2);
	const distance = Math.floor(Math.sqrt(distanceSquared));
	const timeRequired = Number((BigInt(distance) * BigInt(1 * spaceInfo.timePerDistance * 10000)) / BigInt(from.stats.speed));

	return {
		hash,
		timeRequired,
		distance,
		fleetId,
		from: from.location.id,
		to: to.location.id,
		secret,
	};
}