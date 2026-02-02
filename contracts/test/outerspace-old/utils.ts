// Old Outerspace test utilities using viem
import {keccak256, encodeAbiParameters, generatePrivateKey, parseEther} from 'viem';
import {time} from '@nomicfoundation/hardhat-network-helpers';
import type {SpaceInfo} from 'conquest-eth-common';
import type {PlanetInfo} from 'conquest-eth-common/';

type AnyContract = any;
type User = {address: `0x${string}`; [contractName: string]: AnyContract};

async function createPlayerAsContracts(
	env: any,
	player: `0x${string}`,
	contractNames: string[],
): Promise<User> {
	const obj: User = {address: player};
	for (const contractName of contractNames) {
		obj[contractName] = await env.get(contractName);
	}
	return obj;
}

export async function setupOuterSpace(
	env: any,
): Promise<{
	getTime: () => Promise<bigint>;
	increaseTime(t: number): Promise<void>;
	outerSpaceContract: AnyContract;
	spaceInfo: SpaceInfo;
	players: User[];
}> {
	const accounts = await env.accounts();
	const {claimKeyDistributor} = accounts.namedAccounts;
	const players = accounts.unnamedAccounts;

	// Distribute tokens to players
	const distribution = [1000n, 500n, 3000n, 100n];
	for (let i = 0; i < distribution.length; i++) {
		const account = players[i];
		const amount = distribution[i];
		await env.execute({
			account: claimKeyDistributor.address,
			contract: 'ConquestToken',
			functionName: 'transfer',
			args: [account.address, parseEther(String(amount))],
		});
	}

	// Create players with contract connections
	const playersAsContracts = [];
	for (const player of players) {
		const playerObj = await createPlayerAsContracts(env, player.address, [
			'OuterSpace',
			'ConquestToken',
		]);
		playersAsContracts.push(playerObj);
	}

	const outerSpaceDeployment = await env.getDeployment('OuterSpace');

	return {
		async getTime() {
			return await time.latest();
		},
		async increaseTime(t) {
			await time.increase(t);
		},
		outerSpaceContract: await env.get('OuterSpace'),
		spaceInfo: new SpaceInfo(outerSpaceDeployment.linkedData),
		players: playersAsContracts,
	};
}

export async function sendInSecret(
	spaceInfo: SpaceInfo,
	player: User,
	{
		from,
		quantity,
		to,
		gift,
	}: {from: PlanetInfo; quantity: number; to: PlanetInfo; gift: boolean},
): Promise<{
	hash: `0x${string}`;
	timeRequired: number;
	distance: number;
	fleetId: string;
	from: string;
	to: string;
	gift: boolean;
	secret: string;
}> {
	const secret = generatePrivateKey();
	const toHash = keccak256(
		encodeAbiParameters(
			[{type: 'bytes32'}, {type: 'uint256'}, {type: 'bool'}],
			[secret, to.location.id, gift],
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
	const timeRequired = Number(
		(BigInt(distance) * BigInt(1 * spaceInfo.timePerDistance * 10000)) /
			BigInt(from.stats.speed),
	);

	return {
		hash,
		timeRequired,
		distance,
		fleetId,
		from: from.location.id,
		to: to.location.id,
		secret,
		gift,
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
	contract: AnyContract,
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