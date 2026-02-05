import type {Address} from 'viem';
import type {SpaceInfo} from 'conquest-eth-v0-contracts';
import type {FleetStorage} from '../storage/interface.js';
import type {
	Clients,
	ClientsWithOptionalWallet,
	ContractConfig,
	GameContract,
	PendingFleet,
} from '../types.js';
import {getResolvableFleets, resolveFleetWithSpaceInfo} from './resolve.js';
import {sendFleet} from './send.js';
/**
 * FleetManager manages the lifecycle of fleets in the Conquest game
 * including sending new fleets and resolving existing ones
 */
export class FleetManager {
	constructor(
		private readonly clients: ClientsWithOptionalWallet,
		private readonly gameContract: GameContract,
		private readonly spaceInfo: SpaceInfo,
		private readonly contractConfig: ContractConfig,
		private readonly storage: FleetStorage,
		// private readonly contractAddress: Address,
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
	 * Send a fleet to a destination planet
	 */
	async send(
		fromPlanetId: bigint,
		toPlanetId: bigint,
		quantity: number,
		options?: {
			gift?: boolean;
			specific?: Address;
			arrivalTimeWanted?: bigint;
			secret?: `0x${string}`;
		},
	): Promise<PendingFleet> {
		return sendFleet(
			this.requireWalletClient(),
			this.gameContract,
			fromPlanetId,
			toPlanetId,
			quantity,
			this.spaceInfo,
			this.contractConfig,
			this.storage,
			options,
		);
	}

	/**
	 * Resolve (reveal) a fleet to complete its journey
	 */
	async resolve(
		fleetId: string,
	): Promise<{resolved: true; fleet: PendingFleet} | {resolved: false; reason: string}> {
		return resolveFleetWithSpaceInfo(
			this.requireWalletClient(),
			this.gameContract,
			this.spaceInfo,
			fleetId,
			this.storage,
		);
	}

	/**
	 * Get fleets that can be resolved (not yet resolved and past resolve window)
	 */
	async getResolvableFleets(): Promise<PendingFleet[]> {
		return getResolvableFleets(this.storage, this.contractConfig.resolveWindow);
	}

	/**
	 * Get all pending fleets for the current sender
	 */
	async getMyPendingFleets(): Promise<PendingFleet[]> {
		const sender = this.requireWalletClient().walletClient.account!.address;
		return this.storage.getPendingFleetsBySender(sender);
	}

	/**
	 * Get a specific fleet by ID
	 */
	async getFleet(fleetId: string): Promise<PendingFleet | null> {
		return this.storage.getFleet(fleetId);
	}

	/**
	 * Get all fleets in storage
	 */
	async getAllFleets(): Promise<PendingFleet[]> {
		return this.storage.getAllFleets();
	}

	/**
	 * Resolve all fleets that are ready (batch operation)
	 */
	async resolveAllReady(): Promise<{
		successful: PendingFleet[];
		failed: Array<{fleetId: string; reason: string}>;
	}> {
		const readyFleets = await this.getResolvableFleets();
		const successful: PendingFleet[] = [];
		const failed: Array<{fleetId: string; reason: string}> = [];

		for (const fleet of readyFleets) {
			const result = await this.resolve(fleet.fleetId);
			if (result.resolved) {
				successful.push(result.fleet);
			} else {
				failed.push({fleetId: fleet.fleetId, reason: result.reason});
			}
		}

		return {successful, failed};
	}

	/**
	 * Clean up old resolved fleets from storage
	 */
	async cleanupOldResolvedFleets(olderThanDays: number = 7): Promise<void> {
		const olderThan = Math.floor(Date.now() / 1000) - olderThanDays * 24 * 60 * 60;
		await this.storage.cleanupOldResolvedFleets(olderThan);
	}
}
