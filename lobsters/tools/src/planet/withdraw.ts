import type {Clients, GameContract} from '../types.js';

/**
 * Withdraw tokens from planets that have completed their exit process
 *
 * Uses the fetchAndWithdrawFor contract function which fetches any completed
 * exits and withdraws the staked tokens to the owner's wallet.
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
 * @param planetIds - Array of planet location IDs to withdraw from
 * @returns Transaction hash and list of planet IDs for which withdrawals were processed
 */
export async function withdrawFromPlanets(
	clients: Clients,
	gameContract: GameContract,
	planetIds: bigint[],
): Promise<{hash: `0x${string}`; planetsWithdrawn: bigint[]}> {
	const sender = clients.walletClient.account!.address;

	// Simulate the fetchAndWithdrawFor transaction
	const simulation = await clients.publicClient.simulateContract({
		...gameContract,
		functionName: 'fetchAndWithdrawFor',
		args: [sender, planetIds],
		account: sender,
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	return {hash, planetsWithdrawn: planetIds};
}
