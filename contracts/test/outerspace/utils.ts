// Outerspace test utilities using viem and env API
import {keccak256, encodeAbiParameters, zeroAddress, encodePacked} from 'viem';
import type {SpaceInfo} from 'conquest-eth-common';
import type {PlanetInfo} from 'conquest-eth-common/';
import {Abi_IOuterSpace} from '../../generated/abis/IOuterSpace.js';
import {Deployment} from 'rocketh/types';
import {Abi_PlayToken} from '../../generated/abis/PlayToken.js';
import {Environment} from '../../rocketh/config.js';

export type PlanetState = PlanetInfo & {
	state: any;
	getNumSpaceships: (time: bigint) => number;
};

export async function fetchPlanetState(
	env: Environment,
	OuterSpace: Deployment<Abi_IOuterSpace>,
	planet: PlanetInfo,
): Promise<PlanetState> {
	const planetData = await env.read(OuterSpace, {
		functionName: 'getPlanet',
		args: [BigInt(planet.location.id)],
	});
	const stateFromContract = planetData[0];
	const state = {
		owner:
			stateFromContract.owner === zeroAddress
				? undefined
				: stateFromContract.owner,
		ownershipStartTime: stateFromContract.ownershipStartTime,
		exitStartTime: stateFromContract.exitStartTime,
		numSpaceships: stateFromContract.numSpaceships,
		overflow: stateFromContract.overflow,
		lastUpdated: stateFromContract.lastUpdated,
		active: stateFromContract.active ? 'true' : 'false',
		reward: stateFromContract.reward,
	};

	const statsFromContract = planetData[1];
	const stats = {
		...statsFromContract,
	};

	// Check validity assertion
	for (const key of Object.keys(stats)) {
		const value = (stats as any)[key];
		if (value !== (planet as any).stats[key]) {
			throw new Error(
				`${key}: ${(planet as any).stats[key]} not equal to contract stats : ${value} `,
			);
		}
	}

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
	env: Environment,
	OuterSpace: Deployment<Abi_IOuterSpace>,
	PlayToken: Deployment<Abi_PlayToken>,
	playerAddress: `0x${string}`,
	planet: PlanetInfo,
) {
	const amount = BigInt(planet.stats.stake) * 100000000000000n;

	const nativeTokenAmount =
		(amount * 1000000000000000000n) /
		BigInt((PlayToken.linkedData as any).numTokensPerNativeTokenAt18Decimals);

	const receipt = await env.execute(OuterSpace, {
		functionName: 'acquireViaNativeTokenAndStakingToken',
		args: [BigInt(planet.location.id), amount, 0n],
		account: playerAddress,
		value: nativeTokenAmount,
	});
	return receipt;
}

/**
 * Send fleets in secret to a destination planet
 */
export async function sendInSecret(
	env: any,
	OuterSpace: any,
	spaceInfo: SpaceInfo,
	playerAddress: `0x${string}`,
	{from, quantity, to}: {from: PlanetInfo; quantity: number; to: PlanetInfo},
): Promise<{
	receipt: {hahs: `0x${string}`}; // TODO reciept type
	timeRequired: number;
	distance: number;
	fleetId: string;
	from: string;
	to: string;
	secret: `0x${string}`;
	gift: boolean;
	specific: `0x${string}`;
	arrivalTimeWanted: bigint;
	fleetSender: `0x${string}`;
	operator: `0x${string}`;
}> {
	// Use viem's generatePrivateKey equivalent from viem/accounts
	const {generatePrivateKey} = await import('viem/accounts');
	const secret = generatePrivateKey();

	const gift = false;
	const specific = zeroAddress;
	const arrivalTimeWanted = 0n;
	const fleetSender = playerAddress;
	const operator = playerAddress;

	const toHash = keccak256(
		encodePacked(
			['bytes32', 'uint256', 'bool', 'address', 'uint256'],
			[secret, BigInt(to.location.id), gift, specific, arrivalTimeWanted],
		),
	);

	const fleetId = keccak256(
		encodePacked(
			['bytes32', 'uint256', 'address', 'address'],
			[toHash, BigInt(from.location.id), fleetSender, operator],
		),
	);

	const receipt = await env.execute(OuterSpace, {
		functionName: 'send',
		args: [BigInt(from.location.id), BigInt(quantity), toHash],
		account: playerAddress,
	});

	const distanceSquared =
		Math.pow(to.location.globalX - from.location.globalX, 2) +
		Math.pow(to.location.globalY - from.location.globalY, 2);
	const distance = Math.floor(Math.sqrt(distanceSquared));
	const timeRequired = Number(
		(BigInt(distance) * BigInt(1 * spaceInfo.timePerDistance * 10000)) /
			BigInt(from.stats.speed),
	);

	return {
		receipt,
		timeRequired,
		distance,
		fleetId,
		from: from.location.id,
		to: to.location.id,
		secret,
		gift,
		specific,
		arrivalTimeWanted,
		fleetSender,
		operator,
	};
}
