import {getCurrentTimestamp} from '../util/time.js';
import type {FleetStorage} from '../storage/interface.js';
import {Clients, GameContract, PendingExit} from '../types.js';

/**
 * Exit (unstake) multiple planets to retrieve staked tokens
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
 * @param planetIds - Array of planet location IDs to exit
 * @param exitDuration - Duration of the exit process in seconds (from contract config)
 * @param storage - Storage instance for tracking pending exits
 * @returns Transaction hash and list of planet IDs for which exits were initiated
 */
export async function exitPlanets(
	clients: Clients,
	gameContract: GameContract,
	planetIds: bigint[],
	exitDuration: bigint,
	storage: FleetStorage,
): Promise<{hash: `0x${string}`; exitsInitiated: bigint[]}> {
	const sender = clients.walletClient.account!.address;
	const currentTime = getCurrentTimestamp();

	// Get planet states to verify ownership
	const result = await clients.publicClient.readContract({
		...gameContract,
		functionName: 'getPlanetStates',
		args: [planetIds],
	});
	const states = result[0];

	// Create pending exit records for each planet
	const exitsInitiated: bigint[] = [];
	for (let i = 0; i < planetIds.length; i++) {
		const planetId = planetIds[i];
		const state = states[i];

		// Only create exit record for planets owned by the sender
		if (state.owner && state.owner.toLowerCase() === sender.toLowerCase()) {
			const exit: PendingExit = {
				planetId,
				player: sender,
				exitStartTime: currentTime,
				exitDuration: Number(exitDuration),
				exitCompleteTime: currentTime + Number(exitDuration),
				numSpaceships: state.numSpaceships,
				owner: state.owner,
				completed: false,
				interrupted: false,
				lastCheckedAt: currentTime,
				withdrawn: false,
			};

			await storage.savePendingExit(exit);
			exitsInitiated.push(planetId);
		}
	}

	// Get the contract exitMultipleFor function signature
	const simulation = await clients.publicClient.simulateContract({
		...gameContract,
		functionName: 'exitMultipleFor',
		args: [sender, planetIds],
		account: sender,
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	return {hash, exitsInitiated};
}
