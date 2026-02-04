import type {Address} from 'viem';
import type {PendingFleet} from '../types/fleet.js';
import type {PendingExit} from '../types/planet.js';

export interface FleetStorage {
	// Fleet operations
	saveFleet(fleet: PendingFleet): Promise<void>;
	getFleet(fleetId: string): Promise<PendingFleet | null>;
	getPendingFleetsBySender(sender: Address): Promise<PendingFleet[]>;
	getResolvableFleets(): Promise<PendingFleet[]>;
	markResolved(fleetId: string, resolvedAt: number): Promise<void>;
	cleanupOldResolvedFleets(olderThan: number): Promise<void>;
	getAllFleets(): Promise<PendingFleet[]>;

	// Exit operations
	savePendingExit(exit: PendingExit): Promise<void>;
	getPendingExit(planetId: bigint): Promise<PendingExit | null>;
	getPendingExitsByPlayer(player: Address): Promise<PendingExit[]>;
	updateExitStatus(planetId: bigint, updates: Partial<PendingExit>): Promise<void>;
	markExitCompleted(planetId: bigint, completedAt: number): Promise<void>;
	markExitInterrupted(planetId: bigint, interruptedAt: number, newOwner: Address): Promise<void>;
	cleanupOldCompletedExits(olderThan: number): Promise<void>;
	getAllPendingExits(): Promise<PendingExit[]>;
}
