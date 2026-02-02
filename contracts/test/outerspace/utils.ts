// Outerspace test utilities using viem
import {keccak256, encodeAbiParameters, generatePrivateKey, toBytes} from 'viem';
import type {SpaceInfo} from 'conquest-eth-common';
import type {PlanetInfo} from 'conquest-eth-common/';
import type {User} from '../utils/index.js';

export type Player = User<{ConquestToken: any; OuterSpace: any}>;

export async function sendInSecret(
	spaceInfo: SpaceInfo,
	player: Player,
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
	const secret = generatePrivateKey();
	const toHash = keccak256(
		encodeAbiParameters(
			[{type: 'bytes32'}, {type: 'uint256'}],
			[secret, to.location.id],
		),
	);
	const fleetId = keccak256(
		encodeAbiParameters(
			[{type: 'bytes32'}, {type: 'uint256'}],
			[toHash, from.location.id],
		),
	);

	const hash = await player.OuterSpace.write.send([
		from.location.id,
		BigInt(quantity),
		toHash,
	]);

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

type PlanetState = PlanetInfo & {
	state: any;
	getNumSpaceships: (time: bigint) => number;
};

export async function fetchPlanetState(
	contract: any,
	planet: PlanetInfo,
): Promise<PlanetState> {
	const planetData = await contract.read.getPlanet([planet.location.id]);
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
			convertPlanetCallData(value),
		]),
	);

	return {
		...planet,
		state,
		getNumSpaceships(time: bigint) {
			let newSpaceships = 0;
			if (time > state.lastUpdated) {
				console.log({
					time,
					lastUpdated: state.lastUpdated,
					numSpaceships: state.numSpaceships,
					production: planet.stats.production,
				});
				const timeDiff = Number(time - state.lastUpdated);
				newSpaceships = Math.floor((timeDiff * planet.stats.production) / 3600);
			}
			return state.numSpaceships + newSpaceships;
		},
	};
}

/**
 * Acquire a virgin planet for a player
 */
export async function acquire(
	player: Player,
	planet: PlanetInfo,
): Promise<`0x${string}`> {
	const amount = BigInt(planet.stats.stake) * 1000000000000000000n;
	const hash = await player.ConquestToken.write.transferAndCall([
		player.OuterSpace.address,
		amount,
		encodeAbiParameters(
			[{type: 'address'}, {type: 'uint256'}],
			[player.address, planet.location.id],
		),
	]);
	return hash;
}