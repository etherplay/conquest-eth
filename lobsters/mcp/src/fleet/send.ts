import type {Address} from 'viem';
import type {SpaceInfo} from 'conquest-eth-v0-contracts';
import type {FleetStorage} from '../storage/interface.js';
import type {Clients, ContractConfig, GameContract, PendingFleet} from '../types.js';
import {computeFleetId, computeToHash, generateSecret} from '../util/hashing.js';
import {calculateEstimatedArrivalTime, getCurrentTimestamp} from '../util/time.js';

/**
 * Send a fleet to a destination planet
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
 * @param fromPlanetId - Source planet location ID
 * @param toPlanetId - Destination planet location ID
 * @param quantity - Number of spaceships to send
 * @param spaceInfo - SpaceInfo instance for distance calculation
 * @param contractConfig - Contract config for time calculations
 * @param storage - Storage instance for tracking pending fleets
 * @param options - Optional parameters
 * @param options.gift - Whether the fleet is a gift (no combat)
 * @param options.specific - Specific target address (advanced feature)
 * @param options.arrivalTimeWanted - Preferred arrival time (advanced feature)
 * @param options.secret - Random secret for hash commitment (auto-generated if not provided)
 * @returns The pending fleet information
 */
export async function sendFleet(
	clients: Clients,
	gameContract: GameContract,
	fromPlanetId: bigint,
	toPlanetId: bigint,
	quantity: number,
	spaceInfo: SpaceInfo,
	contractConfig: ContractConfig,
	storage: FleetStorage,
	options?: {
		gift?: boolean;
		specific?: Address;
		arrivalTimeWanted?: bigint;
		secret?: `0x${string}`;
	},
): Promise<PendingFleet> {
	const fleetSender = clients.walletClient.account!.address;
	const operator = fleetSender; // Default to same address

	// Get planet info for distance calculation
	const fromPlanet = spaceInfo.getPlanetInfoViaId(fromPlanetId);
	const toPlanet = spaceInfo.getPlanetInfoViaId(toPlanetId);

	if (!fromPlanet || !toPlanet) {
		throw new Error('Could not get planet info for one or both planets');
	}

	// Calculate distance
	const distance = spaceInfo.distance(fromPlanet, toPlanet);

	// Generate secret if not provided
	const secret = options?.secret || generateSecret();

	// Calculate estimated arrival time using contract config
	const estimatedArrivalTime = calculateEstimatedArrivalTime(
		BigInt(distance),
		contractConfig.timePerDistance,
		contractConfig.genesis,
	);

	// Compute the toHash (commitment to destination + secret)
	const toHash = computeToHash(toPlanetId, secret);

	// Get the contract send function signature
	const simulation = await clients.publicClient.simulateContract({
		address: gameContract.address,
		abi: gameContract.abi,
		functionName: 'send',
		args: [fromPlanetId, quantity, toHash],
		account: fleetSender,
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	// Compute fleet ID
	const fleetId = computeFleetId(toHash, fromPlanetId, fleetSender, operator);

	// Create pending fleet record
	const pendingFleet: PendingFleet = {
		fleetId,
		fromPlanetId,
		toPlanetId,
		quantity,
		secret,
		gift: options?.gift ?? false,
		specific: options?.specific ?? '0x0000000000000000000000000000000000000000',
		arrivalTimeWanted: options?.arrivalTimeWanted ?? BigInt(estimatedArrivalTime),
		fleetSender,
		operator,
		committedAt: getCurrentTimestamp(),
		estimatedArrivalTime,
		resolved: false,
	};

	// Save to storage
	await storage.saveFleet(pendingFleet);

	return pendingFleet;
}

/**
 * Send a fleet for another address (advanced feature)
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
 * @param fleetSender - The address that owns the fleet
 * @param fleetOwner - The address that owns the planet (may be different)
 * @param fromPlanetId - Source planet location ID
 * @param toPlanetId - Destination planet location ID
 * @param quantity - Number of spaceships to send
 * @param spaceInfo - SpaceInfo instance for distance calculation
 * @param contractConfig - Contract config for time calculations
 * @param storage - Storage instance for tracking pending fleets
 * @param options - Optional parameters
 * @param options.gift - Whether the fleet is a gift (no combat)
 * @param options.specific - Specific target address (advanced feature)
 * @param options.arrivalTimeWanted - Preferred arrival time (advanced feature)
 * @param options.secret - Random secret for hash commitment (auto-generated if not provided)
 * @returns The pending fleet information
 */
export async function sendFleetFor(
	clients: Clients,
	gameContract: GameContract,
	fleetSender: Address,
	fleetOwner: Address,
	fromPlanetId: bigint,
	toPlanetId: bigint,
	quantity: number,
	spaceInfo: SpaceInfo,
	contractConfig: ContractConfig,
	storage: FleetStorage,
	options?: {
		gift?: boolean;
		specific?: Address;
		arrivalTimeWanted?: bigint;
		secret?: `0x${string}`;
	},
): Promise<PendingFleet> {
	const operator = clients.walletClient.account!.address;

	// Get planet info for distance calculation
	const fromPlanet = spaceInfo.getPlanetInfoViaId(fromPlanetId);
	const toPlanet = spaceInfo.getPlanetInfoViaId(toPlanetId);

	if (!fromPlanet || !toPlanet) {
		throw new Error('Could not get planet info for one or both planets');
	}

	// Calculate distance
	const distance = spaceInfo.distance(fromPlanet, toPlanet);

	// Generate secret if not provided
	const secret = options?.secret || generateSecret();

	// Calculate estimated arrival time using contract config
	const estimatedArrivalTime = calculateEstimatedArrivalTime(
		BigInt(distance),
		contractConfig.timePerDistance,
		contractConfig.genesis,
	);

	// Compute the toHash (commitment to destination + secret)
	const toHash = computeToHash(toPlanetId, secret);

	// Get the contract sendFor function signature
	const simulation = await clients.publicClient.simulateContract({
		address: gameContract.address,
		abi: gameContract.abi,
		functionName: 'sendFor',
		args: [
			{
				fleetSender,
				fleetOwner,
				from: fromPlanetId,
				quantity,
				toHash,
			},
		],
		account: operator,
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	// Compute fleet ID
	const fleetId = computeFleetId(toHash, fromPlanetId, fleetSender, operator);

	// Create pending fleet record
	const pendingFleet: PendingFleet = {
		fleetId,
		fromPlanetId,
		toPlanetId,
		quantity,
		secret,
		gift: options?.gift ?? false,
		specific: options?.specific ?? '0x0000000000000000000000000000000000000000',
		arrivalTimeWanted: options?.arrivalTimeWanted ?? BigInt(estimatedArrivalTime),
		fleetSender,
		operator,
		committedAt: getCurrentTimestamp(),
		estimatedArrivalTime,
		resolved: false,
	};

	// Save to storage
	await storage.saveFleet(pendingFleet);

	return pendingFleet;
}
