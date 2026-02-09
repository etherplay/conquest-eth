import type {Address} from 'viem';
import {PendingExit, PendingFleet} from '../types.js';

/**
 * Storage interface for managing fleets and planet exits
 * Provides methods to persist and retrieve game state data
 */
export interface FleetStorage {
	// Fleet operations

	/**
	 * Save a pending fleet to storage
	 * @param fleet - The fleet to save
	 */
	saveFleet(fleet: PendingFleet): Promise<void>;

	/**
	 * Retrieve a fleet by its ID
	 * @param fleetId - The fleet ID to retrieve
	 * @returns The fleet or null if not found
	 */
	getFleet(fleetId: string): Promise<PendingFleet | null>;

	/**
	 * Get all pending fleets for a specific sender
	 * @param sender - The address of the fleet sender
	 * @returns Array of pending fleets
	 */
	getPendingFleetsBySender(sender: Address): Promise<PendingFleet[]>;

	/**
	 * Get all fleets that can be resolved (not yet resolved)
	 * @returns Array of resolvable fleets
	 */
	getResolvableFleets(): Promise<PendingFleet[]>;

	/**
	 * Mark a fleet as resolved
	 * @param fleetId - The fleet ID to mark as resolved
	 * @param resolvedAt - The timestamp when the fleet was resolved
	 */
	markResolved(fleetId: string, resolvedAt: number): Promise<void>;

	/**
	 * Clean up old resolved fleets from storage
	 * @param olderThan - Unix timestamp; fleets resolved before this time will be removed
	 */
	cleanupOldResolvedFleets(olderThan: number): Promise<void>;

	/**
	 * Get all fleets in storage
	 * @returns Array of all fleets
	 */
	getAllFleets(): Promise<PendingFleet[]>;

	// Exit operations

	/**
	 * Save a pending exit to storage
	 * @param exit - The exit to save
	 */
	savePendingExit(exit: PendingExit): Promise<void>;

	/**
	 * Retrieve a pending exit by planet ID
	 * @param planetId - The planet location ID
	 * @returns The pending exit or null if not found
	 */
	getPendingExit(planetId: bigint): Promise<PendingExit | null>;

	/**
	 * Get all pending exits for a specific player
	 * @param player - The address of the player
	 * @returns Array of pending exits
	 */
	getPendingExitsByPlayer(player: Address): Promise<PendingExit[]>;

	/**
	 * Update the status of a pending exit
	 * @param planetId - The planet location ID
	 * @param updates - Partial updates to apply to the exit record
	 */
	updateExitStatus(planetId: bigint, updates: Partial<PendingExit>): Promise<void>;

	/**
	 * Mark an exit as completed
	 * @param planetId - The planet location ID
	 * @param completedAt - The timestamp when the exit completed
	 */
	markExitCompleted(planetId: bigint, completedAt: number): Promise<void>;

	/**
	 * Mark an exit as interrupted by an attack
	 * @param planetId - The planet location ID
	 * @param interruptedAt - The timestamp when the exit was interrupted
	 * @param newOwner - The address of the new owner who interrupted the exit
	 */
	markExitInterrupted(planetId: bigint, interruptedAt: number, newOwner: Address): Promise<void>;

	/**
	 * Mark an exit as withdrawn (tokens claimed)
	 * @param planetId - The planet location ID
	 * @param withdrawnAt - The timestamp when the tokens were withdrawn
	 */
	markExitWithdrawn(planetId: bigint, withdrawnAt: number): Promise<void>;

	/**
	 * Clean up old completed exits from storage
	 * @param olderThan - Unix timestamp; exits completed before this time will be removed
	 */
	cleanupOldCompletedExits(olderThan: number): Promise<void>;

	/**
	 * Get all pending exits in storage
	 * @returns Array of all pending exits
	 */
	getAllPendingExits(): Promise<PendingExit[]>;
}
