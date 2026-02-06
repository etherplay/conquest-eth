import type {Address, WalletClient} from 'viem';
import type {SpaceInfo} from 'conquest-eth-v0-contracts';
import type {FleetStorage} from '../storage/interface.js';
import {Clients, FleetResolution, GameContract, PendingFleet} from '../types.js';
import {getCurrentTimestamp} from '../util/time.js';

/**
 * Resolve (reveal) a fleet to complete its journey and trigger combat
 *
 * @param walletClient - Viem wallet client for signing transactions
 * @param fleetsRevealContract - The fleets reveal contract instance with address, abi, and clients
 * @param fleetId - The fleet ID to resolve
 * @param storage - Storage instance for tracking pending fleets
 * @returns The resolution result with either resolved fleet or reason for failure
 */
export async function resolveFleet(
	walletClient: WalletClient,
	fleetsRevealContract: {
		address: Address;
		abi: readonly unknown[];
		publicClient: unknown;
		walletClient: WalletClient | undefined;
	},
	fleetId: string,
	storage: FleetStorage,
): Promise<{resolved: true; fleet: PendingFleet} | {resolved: false; reason: string}> {
	// Get the pending fleet from storage
	const pendingFleet = await storage.getFleet(fleetId);

	if (!pendingFleet) {
		return {resolved: false, reason: `Fleet ${fleetId} not found in storage`};
	}

	if (pendingFleet.resolved) {
		return {resolved: false, reason: `Fleet ${fleetId} has already been resolved`};
	}

	// The operator must be the same as the wallet client account
	const operator = walletClient.account!.address;
	if (pendingFleet.operator !== operator) {
		return {resolved: false, reason: `Only the operator can resolve this fleet`};
	}

	// Build the FleetResolution struct
	const resolution: FleetResolution = {
		from: pendingFleet.fromPlanetId,
		to: pendingFleet.toPlanetId,
		distance: 0n, // Will be calculated by SpaceInfo
		arrivalTimeWanted: pendingFleet.arrivalTimeWanted,
		gift: pendingFleet.gift,
		specific: pendingFleet.specific,
		secret: pendingFleet.secret,
		fleetSender: pendingFleet.fleetSender,
		operator: pendingFleet.operator,
	};

	// Get the contract resolveFleet function signature
	const publicClient = fleetsRevealContract.publicClient as any;
	const request = await publicClient.simulateContract({
		address: fleetsRevealContract.address,
		abi: fleetsRevealContract.abi,
		functionName: 'resolveFleet',
		args: [BigInt('0x' + fleetId), resolution],
		account: operator,
	});

	// Send the transaction
	const hash = await walletClient.writeContract(request);

	// Mark fleet as resolved in storage
	const resolvedAt = getCurrentTimestamp();
	await storage.markResolved(fleetId, resolvedAt);

	// Update the fleet record
	const resolvedFleet: PendingFleet = {
		...pendingFleet,
		resolved: true,
		resolvedAt,
	};

	return {resolved: true, fleet: resolvedFleet};
}

/**
 * Resolve a fleet with custom SpaceInfo for distance calculation
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
 * @param spaceInfo - SpaceInfo instance for distance calculation
 * @param fleetId - The fleet ID to resolve
 * @param storage - Storage instance for tracking pending fleets
 * @returns The resolution result with either resolved fleet or reason for failure
 */
export async function resolveFleetWithSpaceInfo(
	clients: Clients,
	gameContract: GameContract,
	spaceInfo: SpaceInfo,
	fleetId: string,
	storage: FleetStorage,
): Promise<{resolved: true; fleet: PendingFleet} | {resolved: false; reason: string}> {
	// Get the pending fleet from storage
	const pendingFleet = await storage.getFleet(fleetId);

	if (!pendingFleet) {
		return {resolved: false, reason: `Fleet ${fleetId} not found in storage`};
	}

	if (pendingFleet.resolved) {
		return {resolved: false, reason: `Fleet ${fleetId} has already been resolved`};
	}

	// The operator must be the same as the wallet client account
	const operator = clients.walletClient.account!.address;
	if (pendingFleet.operator !== operator) {
		return {resolved: false, reason: `Only the operator can resolve this fleet`};
	}

	// Get planet info for distance calculation
	const fromPlanet = spaceInfo.getPlanetInfoViaId(pendingFleet.fromPlanetId);
	const toPlanet = spaceInfo.getPlanetInfoViaId(pendingFleet.toPlanetId);

	if (!fromPlanet || !toPlanet) {
		return {resolved: false, reason: 'Could not get planet info for one or both planets'};
	}

	// Calculate distance using SpaceInfo
	const distance = spaceInfo.distance(fromPlanet, toPlanet);

	// Build the FleetResolution struct
	const resolution: FleetResolution = {
		from: pendingFleet.fromPlanetId,
		to: pendingFleet.toPlanetId,
		distance: BigInt(distance),
		arrivalTimeWanted: pendingFleet.arrivalTimeWanted,
		gift: pendingFleet.gift,
		specific: pendingFleet.specific,
		secret: pendingFleet.secret,
		fleetSender: pendingFleet.fleetSender,
		operator: pendingFleet.operator,
	};

	// Get the contract resolveFleet function signature
	const simulation = await clients.publicClient.simulateContract({
		address: gameContract.address,
		abi: gameContract.abi,
		functionName: 'resolveFleet',
		args: [BigInt(fleetId), resolution],
		account: operator,
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	// Mark fleet as resolved in storage
	const resolvedAt = getCurrentTimestamp();
	await storage.markResolved(fleetId, resolvedAt);

	// Update the fleet record
	const resolvedFleet: PendingFleet = {
		...pendingFleet,
		resolved: true,
		resolvedAt,
	};

	return {resolved: true, fleet: resolvedFleet};
}

/**
 * Get fleets that can be resolved (arrived and still within resolve window)
 *
 * @param storage - Storage instance for tracking pending fleets
 * @param resolveWindow - The resolve window duration in seconds from contract config
 * @returns List of fleets that can be resolved
 */
export async function getResolvableFleets(
	storage: FleetStorage,
	resolveWindow: bigint,
): Promise<PendingFleet[]> {
	const currentTime = getCurrentTimestamp();
	const fleets = await storage.getResolvableFleets();

	return fleets.filter((fleet) => {
		// Fleet can be resolved after arrival but before resolve window closes
		const arrivalTime = fleet.estimatedArrivalTime;
		const resolveWindowEnd = arrivalTime + Number(resolveWindow);
		return !fleet.resolved && currentTime >= arrivalTime && currentTime < resolveWindowEnd;
	});
}
