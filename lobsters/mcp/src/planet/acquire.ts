import {Clients, GameContract} from '../types.js';

/**
 * Acquire (stake) multiple planets
 *
 * @param clients - Viem clients (publicClient and walletClient)
 * @param gameContract - The game contract instance with address and ABI
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

	const nativeTokenAmount = (amountToMint * 1000000000000000000n) / 1000000000000000000000n; // TODO BigInt((PlayToken.linkedData as any).numTokensPerNativeTokenAt18Decimals);

	console.log(
		`Acquiring ${planetIds.length} planets with ${amountToMint} native tokens and ${tokenAmount} staking tokens using ${nativeTokenAmount} native tokens`,
	);

	// Get the contract acquireMultipleViaNativeTokenAndStakingToken function signature
	const simulation = await clients.publicClient.simulateContract({
		...gameContract,
		functionName: 'acquireMultipleViaNativeTokenAndStakingToken',
		args: [planetIds, amountToMint, tokenAmount],
		account: sender,
		value: nativeTokenAmount,
	});

	// Send the transaction
	const hash = await clients.walletClient.writeContract(simulation.request);

	return {hash, planetsAcquired: planetIds};
}
