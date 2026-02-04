import {Clients, GameContract} from '../types.js';

/**
 * Acquire (stake) multiple planets
 *
 * @param walletClient - Viem wallet client for signing transactions
 * @param publicClient - Viem public client for querying the blockchain
 * @param contractAddress - The game contract address
 * @param contractAbi - The contract ABI
 * @param planetIds - Array of planet location IDs to acquire
 * @param amountToMint - Amount of native token to spend
 * @param tokenAmount - Amount of staking token to spend
 * @returns Transaction hash and list of planets acquired
 */
export async function acquirePlanets(
	clients: Clients,
	gameContract: GameContract,
	planetIds: bigint[],
	amountToMint: bigint,
	tokenAmount: bigint,
): Promise<{hash: `0x${string}`; planetsAcquired: bigint[]}> {
	const sender = clients.walletClient.account!.address;

	// Get the contract acquireMultipleViaNativeTokenAndStakingToken function signature
	const simulation = await clients.publicClient.simulateContract({
		...gameContract,
		functionName: 'acquireMultipleViaNativeTokenAndStakingToken',
		args: [planetIds, amountToMint, tokenAmount],
		account: sender,
		value: BigInt(amountToMint),
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	return {hash, planetsAcquired: planetIds};
}
