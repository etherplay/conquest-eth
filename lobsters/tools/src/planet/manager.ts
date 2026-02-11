import {zeroAddress, type Address} from 'viem';
import type {SpaceInfo} from 'conquest-eth-v0-contracts';
import type {PlanetInfo, PlanetState} from 'conquest-eth-v0-contracts';
import {acquirePlanets} from './acquire.js';
import {exitPlanets} from './exit.js';
import {withdrawFromPlanets} from './withdraw.js';
import type {FleetStorage} from '../storage/interface.js';
import type {
	Clients,
	ClientsWithOptionalWallet,
	ContractConfig,
	ExternalPlanet,
	GameContract,
	PendingExit,
} from '../types.js';

// ERC20 balanceOf ABI for checking play token balance
const erc20BalanceOfAbi = [
	{
		name: 'balanceOf',
		type: 'function',
		stateMutability: 'view',
		inputs: [{name: 'account', type: 'address'}],
		outputs: [{name: '', type: 'uint256'}],
	},
] as const;

// ERC20 allowance ABI for checking approval
const erc20AllowanceAbi = [
	{
		name: 'allowance',
		type: 'function',
		stateMutability: 'view',
		inputs: [
			{name: 'owner', type: 'address'},
			{name: 'spender', type: 'address'},
		],
		outputs: [{name: '', type: 'uint256'}],
	},
] as const;

// ERC20 approve ABI for approving tokens
const erc20ApproveAbi = [
	{
		name: 'approve',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{name: 'spender', type: 'address'},
			{name: 'amount', type: 'uint256'},
		],
		outputs: [{name: '', type: 'bool'}],
	},
] as const;

// Max uint256 value for unlimited approval
const MAX_UINT256 = 2n ** 256n - 1n;

/**
 * PlanetManager manages planet-related operations in the Conquest game
 * including acquiring new planets and initiating exit processes
 */
export class PlanetManager {
	constructor(
		private readonly clients: ClientsWithOptionalWallet,
		private readonly gameContract: GameContract,
		private readonly spaceInfo: SpaceInfo,
		private readonly contractConfig: ContractConfig,
		private readonly storage: FleetStorage,
	) {}

	/**
	 * Ensure walletClient is available for operations that require it
	 */
	private requireWalletClient(): Clients {
		if (!this.clients.walletClient) {
			throw new Error(
				'Wallet client is required for this operation. Please provide a PRIVATE_KEY environment variable.',
			);
		}
		return this.clients as Clients;
	}

	/**
	 * Acquire (stake) multiple planets
	 */
	async acquire(
		planetIds: bigint[],
		amountToMint: bigint,
		tokenAmount: bigint,
	): Promise<{hash: `0x${string}`; planetsAcquired: bigint[]}> {
		return acquirePlanets(
			this.requireWalletClient(),
			this.gameContract,
			planetIds,
			amountToMint,
			tokenAmount,
			this.contractConfig.numTokensPerNativeToken,
		);
	}

	/**
	 * Acquire (stake) multiple planets with automatic cost calculation
	 */
	async acquireWithAutoCalc(planetIds: bigint[]): Promise<{
		hash: `0x${string}`;
		planetsAcquired: bigint[];
		costs: {amountToMint: bigint; tokenAmount: bigint};
	}> {
		const costs = this.calculateAcquisitionCosts(planetIds);
		const result = await acquirePlanets(
			this.requireWalletClient(),
			this.gameContract,
			planetIds,
			costs.amountToMint,
			costs.tokenAmount,
			this.contractConfig.numTokensPerNativeToken,
		);
		return {...result, costs};
	}

	/**
	 * Get the play token (staking token) balance for an address
	 *
	 * @param address - Address to check balance for. Defaults to current wallet address.
	 * @returns The balance in raw units (18 decimals)
	 */
	async getPlayTokenBalance(address?: `0x${string}`): Promise<bigint> {
		let targetAddress: `0x${string}`;

		if (address) {
			targetAddress = address;
		} else {
			const clients = this.requireWalletClient();
			targetAddress = clients.walletClient.account!.address;
		}

		const balanceRaw = await this.clients.publicClient.readContract({
			address: this.contractConfig.stakingToken,
			abi: erc20BalanceOfAbi,
			functionName: 'balanceOf',
			args: [targetAddress],
		});

		return balanceRaw;
	}

	/**
		* Check current allowance for play token to the game contract
		*
		* @param address - Address to check allowance for. Defaults to current wallet address.
		* @returns The current allowance amount
		*/
	async getPlayTokenAllowance(address?: `0x${string}`): Promise<bigint> {
		let targetAddress: `0x${string}`;

		if (address) {
			targetAddress = address;
		} else {
			const clients = this.requireWalletClient();
			targetAddress = clients.walletClient.account!.address;
		}

		const allowance = await this.clients.publicClient.readContract({
			address: this.contractConfig.stakingToken,
			abi: erc20AllowanceAbi,
			functionName: 'allowance',
			args: [targetAddress, this.gameContract.address],
		});

		return allowance;
	}

	/**
		* Approve play tokens for the game contract.
		* Approves the maximum uint256 value for unlimited spending.
		*
		* @returns Transaction hash of the approval transaction
		*/
	async approvePlayToken(): Promise<`0x${string}`> {
		const clients = this.requireWalletClient();

		const hash = await clients.walletClient.writeContract({
			address: this.contractConfig.stakingToken,
			abi: erc20ApproveAbi,
			functionName: 'approve',
			args: [this.gameContract.address, MAX_UINT256],
			chain: clients.walletClient.chain,
			account: clients.walletClient.account!,
		});

		// Wait for the transaction to be confirmed
		await this.clients.publicClient.waitForTransactionReceipt({hash});

		return hash;
	}

	/**
		* Ensure sufficient allowance for play tokens to the game contract.
		* If current allowance is less than the required amount, approves max uint256.
		*
		* @param requiredAmount - The amount of tokens that need to be approved
		* @returns Object indicating if approval was needed and the approval tx hash if applicable
		*/
	async ensurePlayTokenAllowance(
		requiredAmount: bigint,
	): Promise<{approvalNeeded: boolean; approvalHash?: `0x${string}`}> {
		if (requiredAmount === 0n) {
			return {approvalNeeded: false};
		}

		const currentAllowance = await this.getPlayTokenAllowance();

		if (currentAllowance >= requiredAmount) {
			return {approvalNeeded: false};
		}

		const approvalHash = await this.approvePlayToken();
		return {approvalNeeded: true, approvalHash};
	}

	/**
		* Calculate acquisition costs for planets based on their stats
	 *
	 * @param planetIds - Array of planet location IDs
	 * @returns Object with total amountToMint and tokenAmount
	 */
	calculateAcquisitionCosts(planetIds: bigint[]): {amountToMint: bigint; tokenAmount: bigint} {
		const DECIMAL_14 = 100000000000000n;
		let totalTokenAmount = 0n;
		for (const planetId of planetIds) {
			const planet = this.getPlanetInfo(planetId);
			if (!planet) {
				throw new Error(`Planet ${planetId} not found`);
			}
			// Use the planet's stake value from its statistics
			// Multiply by DECIMAL_14 as the contract does
			totalTokenAmount += BigInt(planet.stats.stake) * DECIMAL_14;
		}

		const amountToMint = totalTokenAmount;

		// When using native token, we set tokenAmount to 0
		return {amountToMint, tokenAmount: 0n};
	}

	/**
	 * Acquire (stake) multiple planets using maximum available play token balance first,
	 * then minting the remainder with native tokens.
	 *
	 * This simplifies planet acquisition by automatically:
	 * 1. Calculating required token amount based on planet stats
	 * 2. Checking and approving play token allowance if needed
	 * 3. Using ALL available play token balance first
	 * 4. Minting any remaining amount needed using native tokens (if allowed)
	 *
	 * If numTokensPerNativeToken is zero, minting via native token is disabled.
	 * In that case, only play tokens can be used and an error is thrown if
	 * there aren't enough play tokens to cover the acquisition cost.
	 *
	 * @param planetIds - Array of planet location IDs to acquire
	 * @returns Transaction hash, planets acquired, cost breakdown, and approval info
	 */
	async acquireWithMaxPlayToken(planetIds: bigint[]): Promise<{
		hash: `0x${string}`;
		planetsAcquired: bigint[];
		costs: {
			totalRequired: bigint;
			playTokenUsed: bigint;
			amountMinted: bigint;
		};
		approval: {
			approvalNeeded: boolean;
			approvalHash?: `0x${string}`;
		};
	}> {
		// Calculate total required token amount
		const {amountToMint: totalRequired} = this.calculateAcquisitionCosts(planetIds);

		// Get current play token balance
		const playTokenBalance = await this.getPlayTokenBalance();

		// Check if minting via native token is allowed
		const nativeMintingAllowed = this.contractConfig.numTokensPerNativeToken > 0n;

		// Determine how much play token to use (all of it, up to what's needed)
		const playTokenUsed = playTokenBalance > totalRequired ? totalRequired : playTokenBalance;

		// Calculate remaining amount to mint with native tokens
		const amountToMint = totalRequired > playTokenUsed ? totalRequired - playTokenUsed : 0n;

		// If minting is not allowed and we need to mint, error out
		if (!nativeMintingAllowed && amountToMint > 0n) {
			throw new Error(
				`Insufficient play token balance. Required: ${totalRequired}, Available: ${playTokenBalance}. ` +
					`Minting via native token is disabled (numTokensPerNativeToken is zero).`,
			);
		}

		// Ensure sufficient allowance for play tokens before acquiring
		const approval = await this.ensurePlayTokenAllowance(playTokenUsed);

		// Acquire the planets
		const result = await acquirePlanets(
			this.requireWalletClient(),
			this.gameContract,
			planetIds,
			amountToMint,
			playTokenUsed,
			this.contractConfig.numTokensPerNativeToken,
		);

		return {
			...result,
			costs: {
				totalRequired,
				playTokenUsed,
				amountMinted: amountToMint,
			},
			approval,
		};
	}

	/**
	 * Exit (unstake) multiple planets
	 */
	async exit(planetIds: bigint[]): Promise<{hash: `0x${string}`; exitsInitiated: bigint[]}> {
		return exitPlanets(
			this.requireWalletClient(),
			this.gameContract,
			planetIds,
			this.contractConfig.exitDuration,
			this.storage,
		);
	}

	/**
	 * Withdraw tokens from planets that have completed their exit process
	 *
	 * @param planetIds - Array of planet location IDs to withdraw from
	 * @returns Transaction hash and list of planet IDs for which withdrawals were processed
	 */
	async withdraw(planetIds: bigint[]): Promise<{hash: `0x${string}`; planetsWithdrawn: bigint[]}> {
		const result = await withdrawFromPlanets(
			this.requireWalletClient(),
			this.gameContract,
			planetIds,
		);

		// Mark the exits as withdrawn in storage
		const currentTime = Math.floor(Date.now() / 1000);
		for (const planetId of result.planetsWithdrawn) {
			await this.storage.markExitWithdrawn(planetId, currentTime);
		}

		return result;
	}

	/**
	 * Get exits that are ready to be withdrawn
	 *
	 * Returns all pending exits that:
	 * - Have completed (exit time has passed)
	 * - Were not interrupted
	 * - Have not been withdrawn yet
	 *
	 * @returns Array of pending exits ready for withdrawal
	 */
	async getWithdrawableExits(): Promise<PendingExit[]> {
		const sender = this.requireWalletClient().walletClient.account!.address;
		const allExits = await this.storage.getPendingExitsByPlayer(sender);
		const currentTime = Math.floor(Date.now() / 1000);

		return allExits.filter((exit) => {
			// Must be past exit complete time
			const isPastExitTime = currentTime >= exit.exitCompleteTime;
			// Must not be interrupted
			const notInterrupted = !exit.interrupted;
			// Must not already be withdrawn
			const notWithdrawn = !exit.withdrawn;

			return isPastExitTime && notInterrupted && notWithdrawn;
		});
	}

	/**
	 * Withdraw all tokens from planets that have completed their exit process
	 *
	 * This method automatically finds all pending exits that are:
	 * - Past their completion time
	 * - Not interrupted
	 * - Not already withdrawn
	 *
	 * @returns Transaction hash and list of planet IDs for which withdrawals were processed, or null if no withdrawable exits found
	 */
	async withdrawAll(): Promise<{hash: `0x${string}`; planetsWithdrawn: bigint[]} | null> {
		const withdrawableExits = await this.getWithdrawableExits();

		if (withdrawableExits.length === 0) {
			return null;
		}

		const planetIds = withdrawableExits.map((exit) => exit.planetId);
		return this.withdraw(planetIds);
	}

	/**
	 * Get planet info by location ID
	 */
	getPlanetInfo(planetId: bigint): PlanetInfo | undefined {
		return this.spaceInfo.getPlanetInfoViaId(planetId);
	}

	/**
	 * Get planet ID by x,y coordinates
	 * @param x - X coordinate
	 * @param y - Y coordinate
	 * @returns Planet location ID as bigint, or undefined if no planet exists at coordinates
	 */
	getPlanetIdByCoordinates(x: number, y: number): bigint | undefined {
		const planet = this.spaceInfo.getPlanetInfo(x, y);
		return planet?.location.id;
	}

	/**
	 * Get multiple planet infos
	 */
	getPlanetInfos(planetIds: bigint[]): (PlanetInfo | undefined)[] {
		return planetIds.map((id) => this.getPlanetInfo(id));
	}

	/**
	 * Get planets around a center point within a radius
	 */
	async getPlanetsAround(
		centerX: number,
		centerY: number,
		radius: number,
	): Promise<{info: PlanetInfo; state: PlanetState}[]> {
		// Get planet infos from SpaceInfo within the bounding box
		const planetsInRect: PlanetInfo[] = [];
		for (const planet of this.spaceInfo.yieldPlanetsFromRect(
			centerX - radius,
			centerY - radius,
			centerX + radius,
			centerY + radius,
		)) {
			// Calculate actual distance to filter by radius
			const dx = planet.location.x - centerX;
			const dy = planet.location.y - centerY;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance <= radius) {
				planetsInRect.push(planet);
			}
		}

		// Batch query contract for planet states
		const planetIds = planetsInRect.map((p) => p.location.id);
		const result = await this.clients.publicClient.readContract({
			address: this.gameContract.address,
			abi: this.gameContract.abi,
			functionName: 'getPlanetStates',
			args: [planetIds],
		});

		const states = result[0];

		// Get current time for computing latest state
		const currentTime = Math.floor(Date.now() / 1000);

		// Combine info with states and compute latest state
		return planetsInRect.map((planet, index) => {
			const rawState = states[index];
			// Create a mutable copy of the state to compute updates
			const stateCopy = {
				owner: rawState.owner === zeroAddress ? undefined : rawState.owner,
				ownerYakuzaSubscriptionEndTime: 0, // TODO
				lastUpdatedSaved: rawState.lastUpdated,
				startExitTime: rawState.exitStartTime,
				numSpaceships: rawState.numSpaceships,
				flagTime: 0, // TODO
				travelingUpkeep: 0, // TODO
				overflow: 0, // TODO
				active: rawState.active,
				exiting: false, // will be populated
				exitTimeLeft: 0, // will be populated
				natives: false, // will be populated
				capturing: false, // will be populated
				inReach: false, // will be populated
				rewardGiver: '', // will be populated
				metadata: {},
			};
			// Compute the latest state using SpaceInfo
			this.spaceInfo.computePlanetUpdateForTimeElapsed(stateCopy, planet, currentTime);
			return {
				info: planet,
				state: stateCopy,
			};
		});
	}

	/**
	 * Get my planets (owned by the current wallet)
	 */
	async getMyPlanets(
		radius: number = 100,
	): Promise<Array<{info: PlanetInfo; state: ExternalPlanet}>> {
		const sender = this.requireWalletClient().walletClient.account!.address;

		// For now, use a simple approach: get all planets in area and filter by owner
		// A better approach would be to use an index or The Graph
		const planetsInRect: PlanetInfo[] = [];

		// Get planets from 0,0 out to radius
		for (const planet of this.spaceInfo.yieldPlanetsFromRect(-radius, -radius, radius, radius)) {
			planetsInRect.push(planet);
		}

		// Batch query contract for planet states
		const planetIds = planetsInRect.map((p) => p.location.id);
		const result = await this.clients.publicClient.readContract({
			address: this.gameContract.address,
			abi: this.gameContract.abi,
			functionName: 'getPlanetStates',
			args: [planetIds],
		});
		const states = result[0];

		// Get current time for computing latest state
		const currentTime = Math.floor(Date.now() / 1000);

		// Filter by owner and compute latest state
		const myPlanets: Array<{info: PlanetInfo; state: ExternalPlanet}> = [];
		for (let i = 0; i < planetsInRect.length; i++) {
			const rawState = states[i];
			if (rawState && rawState.owner && rawState.owner.toLowerCase() === sender.toLowerCase()) {
				// Create a mutable copy of the state to compute updates
				const stateCopy: any = {...rawState};
				// Compute the latest state using SpaceInfo
				this.spaceInfo.computePlanetUpdateForTimeElapsed(stateCopy, planetsInRect[i], currentTime);
				myPlanets.push({info: planetsInRect[i], state: stateCopy});
			}
		}

		return myPlanets;
	}

	/**
	 * Get pending exits for the current player
	 */
	async getMyPendingExits(): Promise<PendingExit[]> {
		const sender = this.requireWalletClient().walletClient.account!.address;
		return this.storage.getPendingExitsByPlayer(sender);
	}

	/**
	 * Verify exit status for a planet
	 */
	async verifyExitStatus(
		planetId: bigint,
	): Promise<{exit: PendingExit; interrupted: boolean; newOwner?: Address}> {
		const exit = await this.storage.getPendingExit(planetId);
		if (!exit) {
			throw new Error(`No pending exit found for planet ${planetId}`);
		}

		// Query contract for current planet state
		const result = await this.clients.publicClient.readContract({
			...this.gameContract,
			functionName: 'getPlanetStates',
			args: [[planetId]],
		});
		const states = result[0];

		if (states.length === 0) {
			throw new Error(`Could not get planet state for ${planetId}`);
		}

		const currentState = states[0];
		const currentTime = Math.floor(Date.now() / 1000);

		// Check if exit was interrupted by an attack
		let interrupted = false;
		if (currentState.owner && currentState.owner.toLowerCase() !== exit.player.toLowerCase()) {
			interrupted = true;
			await this.storage.markExitInterrupted(planetId, currentTime, currentState.owner);
		}

		// Check if exit is complete
		if (!currentState.active && currentTime >= exit.exitCompleteTime) {
			await this.storage.markExitCompleted(planetId, currentTime);
		}

		const updatedExit = await this.storage.getPendingExit(planetId);
		if (!updatedExit) {
			throw new Error('Exit was cleaned up during verification');
		}

		return {
			exit: updatedExit,
			interrupted,
			newOwner: currentState.owner,
		};
	}

	/**
	 * Clean up old completed exits
	 */
	async cleanupOldCompletedExits(olderThanDays: number = 7): Promise<void> {
		const olderThan = Math.floor(Date.now() / 1000) - olderThanDays * 24 * 60 * 60;
		await this.storage.cleanupOldCompletedExits(olderThan);
	}

	/**
	 * Calculate distance between two planets
	 */
	calculateDistance(fromPlanetId: bigint, toPlanetId: bigint): number | undefined {
		const fromPlanet = this.getPlanetInfo(fromPlanetId);
		const toPlanet = this.getPlanetInfo(toPlanetId);

		if (!fromPlanet || !toPlanet) {
			return undefined;
		}

		return this.spaceInfo.distance(fromPlanet, toPlanet);
	}
}
