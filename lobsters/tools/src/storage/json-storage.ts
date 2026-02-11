import {promises as fs} from 'fs';
import path from 'path';
import type {Address} from 'viem';
import type {FleetStorage} from './interface.js';
import {PendingExit, PendingFleet} from '../types.js';
import {stringifyWithBigInt} from '../tool-handling/index.js';

interface StorageData {
	fleets: Record<string, PendingFleet>;
	exits: Record<string, PendingExit>;
}

export class JsonFleetStorage implements FleetStorage {
	private dataPath: string;
	private data: StorageData;
	private initialized = false;

	constructor(dataDir: string = './data', chainId?: number, contractAddress?: string) {
		// Organize data by network/contract in subdirectories
		let basePath = dataDir;
		if (chainId !== undefined) {
			basePath = path.join(basePath, chainId.toString());
		}
		if (contractAddress) {
			basePath = path.join(basePath, contractAddress.toLowerCase());
		}
		this.dataPath = path.join(basePath, 'conquest-data.json');
		this.data = {fleets: {}, exits: {}};
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}
		// Load from disk or create new
		try {
			await fs.mkdir(path.dirname(this.dataPath), {recursive: true});
			const content = await fs.readFile(this.dataPath, 'utf-8');
			const data = JSON.parse(content);
			// Convert BigInt strings back to BigInt
			for (const fleetId in data.fleets) {
				const fleet = data.fleets[fleetId];
				fleet.fromPlanetId = BigInt(fleet.fromPlanetId);
				fleet.toPlanetId = BigInt(fleet.toPlanetId);
				fleet.arrivalTimeWanted = BigInt(fleet.arrivalTimeWanted);
			}
			for (const planetId in data.exits) {
				const exit = data.exits[planetId];
				exit.planetId = BigInt(exit.planetId);
			}
			this.data = data;
		} catch (error) {
			// File doesn't exist, create new
			await this.save();
		}
		this.initialized = true;
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.initialize();
		}
	}

	private async save(): Promise<void> {
		await fs.writeFile(this.dataPath, stringifyWithBigInt(this.data, 2));
	}

	// Fleet operations
	async saveFleet(fleet: PendingFleet): Promise<void> {
		await this.ensureInitialized();
		this.data.fleets[fleet.fleetId] = fleet;
		await this.save();
	}

	async getFleet(fleetId: string): Promise<PendingFleet | null> {
		await this.ensureInitialized();
		return this.data.fleets[fleetId] || null;
	}

	async getPendingFleetsBySender(sender: Address): Promise<PendingFleet[]> {
		await this.ensureInitialized();
		return Object.values(this.data.fleets).filter(
			(fleet) => fleet.fleetSender.toLowerCase() === sender.toLowerCase() && !fleet.resolved,
		);
	}

	async getResolvableFleets(): Promise<PendingFleet[]> {
		await this.ensureInitialized();
		const now = Math.floor(Date.now() / 1000);
		return Object.values(this.data.fleets).filter(
			(fleet) => !fleet.resolved && fleet.estimatedArrivalTime <= now,
		);
	}

	async markResolved(fleetId: string, resolvedAt: number): Promise<void> {
		await this.ensureInitialized();
		const fleet = this.data.fleets[fleetId];
		if (fleet) {
			fleet.resolved = true;
			fleet.resolvedAt = resolvedAt;
			await this.save();
		}
	}

	async cleanupOldResolvedFleets(olderThan: number): Promise<void> {
		await this.ensureInitialized();
		const now = Math.floor(Date.now() / 1000);
		for (const fleetId in this.data.fleets) {
			const fleet = this.data.fleets[fleetId];
			if (fleet.resolved && fleet.resolvedAt && fleet.resolvedAt < now - olderThan) {
				delete this.data.fleets[fleetId];
			}
		}
		await this.save();
	}

	async getAllFleets(): Promise<PendingFleet[]> {
		await this.ensureInitialized();
		return Object.values(this.data.fleets);
	}

	// Exit operations
	async savePendingExit(exit: PendingExit): Promise<void> {
		await this.ensureInitialized();
		this.data.exits[exit.planetId.toString()] = exit;
		await this.save();
	}

	async getPendingExit(planetId: bigint): Promise<PendingExit | null> {
		await this.ensureInitialized();
		return this.data.exits[planetId.toString()] || null;
	}

	async getPendingExitsByPlayer(player: Address): Promise<PendingExit[]> {
		await this.ensureInitialized();
		return Object.values(this.data.exits).filter(
			(exit) => exit.player.toLowerCase() === player.toLowerCase() && !exit.completed,
		);
	}

	async updateExitStatus(planetId: bigint, updates: Partial<PendingExit>): Promise<void> {
		await this.ensureInitialized();
		const exit = this.data.exits[planetId.toString()];
		if (exit) {
			Object.assign(exit, updates);
			await this.save();
		}
	}

	async markExitCompleted(planetId: bigint, completedAt: number): Promise<void> {
		await this.ensureInitialized();
		const exit = this.data.exits[planetId.toString()];
		if (exit) {
			exit.completed = true;
			exit.lastCheckedAt = completedAt;
			await this.save();
		}
	}

	async markExitInterrupted(
		planetId: bigint,
		interruptedAt: number,
		newOwner: Address,
	): Promise<void> {
		await this.ensureInitialized();
		const exit = this.data.exits[planetId.toString()];
		if (exit) {
			exit.interrupted = true;
			exit.lastCheckedAt = interruptedAt;
			exit.owner = newOwner;
			await this.save();
		}
	}

	async markExitWithdrawn(planetId: bigint, withdrawnAt: number): Promise<void> {
		await this.ensureInitialized();
		const exit = this.data.exits[planetId.toString()];
		if (exit) {
			exit.withdrawn = true;
			exit.withdrawnAt = withdrawnAt;
			await this.save();
		}
	}

	async cleanupOldCompletedExits(olderThan: number): Promise<void> {
		await this.ensureInitialized();
		const now = Math.floor(Date.now() / 1000);
		for (const planetId in this.data.exits) {
			const exit = this.data.exits[planetId];
			if (exit.completed && exit.lastCheckedAt < now - olderThan) {
				delete this.data.exits[planetId];
			}
		}
		await this.save();
	}

	async getAllPendingExits(): Promise<PendingExit[]> {
		await this.ensureInitialized();
		return Object.values(this.data.exits);
	}
}
