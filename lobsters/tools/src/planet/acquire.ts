import {Clients, GameContract} from '../types.js';

/**
 * Acquire (stake) multiple planets
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
 * @param planetIds - Array of planet location IDs to acquire
 * @param amountToMint - Amount of play tokens to mint
 * @param tokenAmount - Amount of staking token to spend
 * @param numTokensPerNativeToken - How many play tokens (at 18 decimals) you get per 1 native token (fetched from PlayToken contract)
 * @returns Transaction hash and list of planets acquired
 */
export async function acquirePlanets(
	clients: Clients,
	gameContract: GameContract,
	planetIds: bigint[],
	amountToMint: bigint,
	tokenAmount: bigint,
	numTokensPerNativeToken: bigint,
): Promise<{hash: `0x${string}`; planetsAcquired: bigint[]}> {
	const sender = clients.walletClient.account!.address;

	// Calculate how much native token is needed to mint `amountToMint` play tokens
	// nativeTokenAmount = amountToMint * 1e18 / numTokensPerNativeToken
	const nativeTokenAmount = (amountToMint * 1000000000000000000n) / numTokensPerNativeToken;

	// Get the contract acquireMultipleViaNativeTokenAndStakingToken function signature
	const simulation = await clients.publicClient.simulateContract({
		...gameContract,
		functionName: 'acquireMultipleViaNativeTokenAndStakingToken',
		args: [planetIds, amountToMint, tokenAmount],
		account: sender,
		value: nativeTokenAmount,
	});

	// Send the transaction
	// Explicitly pass the account to ensure local signing is used
	const hash = await clients.walletClient.writeContract({
		...simulation.request,
		account: clients.walletClient.account!,
	});

	return {hash, planetsAcquired: planetIds};
}
