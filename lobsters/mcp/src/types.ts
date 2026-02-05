import type {Address, PublicClient, WalletClient} from 'viem';
import type {PlanetInfo} from 'conquest-eth-v0-contracts';
import type {Abi_IOuterSpace} from 'conquest-eth-v0-contracts/abis/IOuterSpace.js';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {z} from 'zod';
import type {FleetManager} from './fleet/manager.js';
import type {PlanetManager} from './planet/manager.js';

export interface StorageConfig {
	type: 'json' | 'sqlite';
	dataDir?: string; // Default: `${cwd}/data`
}

export type GameContract = {
	address: Address;
	abi: Abi_IOuterSpace;
};

export type ClientsWithOptionalWallet = {
	walletClient?: WalletClient;
	publicClient: PublicClient;
};

export type Clients = {
	walletClient: WalletClient;
	publicClient: PublicClient;
};

export interface ContractConfig {
	genesis: bigint;
	resolveWindow: bigint;
	timePerDistance: bigint;
	exitDuration: bigint;
	acquireNumSpaceships: number;
	[key: string]: bigint | number;
}

export interface ExternalPlanet {
	owner?: `0x${string}`;
	ownerYakuzaSubscriptionEndTime: number;
	lastUpdatedSaved: number;
	startExitTime: number;
	numSpaceships: number;
	flagTime: number;
	travelingUpkeep: number;
	overflow: number;
	active: boolean;
	exiting: boolean;
	exitTimeLeft: number;
	natives: boolean;
	capturing: boolean;
	inReach: boolean;
	rewardGiver: `0x${string}`;
	requireClaimAcknowledgement?: string;
	metadata: Record<string, string | number | boolean>;
}

export interface PendingExit {
	planetId: bigint; // Planet location ID
	player: string; // Player who initiated the exit
	exitStartTime: number; // Timestamp when exit was initiated
	exitDuration: number; // Duration of exit process (typically 7 days)
	exitCompleteTime: number; // When exit will complete
	numSpaceships: number; // Spaceships on planet at exit start
	owner: string; // Current owner (may change due to attacks)
	completed: boolean; // Whether exit has completed
	interrupted: boolean; // Whether exit was interrupted by attack
	lastCheckedAt: number; // Last time status was verified against contract
}

export interface PlanetWithDistance {
	info: PlanetInfo;
	state?: ExternalPlanet;
	distance: number;
	hasPendingExit?: boolean;
	exitInfo?: {
		exitStartTime: number;
		exitCompleteTime: number;
		timeUntilComplete: number;
	};
}

export interface PendingFleet {
	hash?: `0x${string}`; // Hash of the fleet (toHash)
	fleetId: string; // Computed from toHash, from, fleetSender, operator
	fromPlanetId: bigint; // Source planet location
	toPlanetId: bigint; // Destination planet location (hidden during commit)
	quantity: number; // Number of spaceships
	secret: `0x${string}`; // Random secret for hash commitment
	gift: boolean; // Whether this is a gift (no combat)
	specific: `0x${string}`; // Specific target address (advanced feature)
	arrivalTimeWanted: bigint; // Preferred arrival time (advanced feature)
	fleetSender: `0x${string}`; // Address that sent the fleet
	operator: `0x${string}`; // Address that committed the transaction
	committedAt: number; // Timestamp of commit transaction
	estimatedArrivalTime: number; // Estimated arrival time
	resolved: boolean; // Whether fleet has been revealed/resolved
	resolvedAt?: number; // Timestamp of resolution
}

export interface FleetResolution {
	from: bigint; // Source planet location
	to: bigint; // Destination planet location
	distance: bigint; // Distance between planets
	arrivalTimeWanted: bigint; // Preferred arrival time
	gift: boolean; // Whether this is a gift
	specific: `0x${string}`; // Specific target address
	secret: `0x${string}`; // The secret used to generate the hash
	fleetSender: `0x${string}`; // Address that sent the fleet
	operator: `0x${string}`; // Address that committed the transaction
}

// Tool types for MCP server refactoring
export type ToolEnvironment = {
	// Function to send status updates during tool execution (required)
	sendStatus: (message: string) => Promise<void>;
	// Fleet manager for fleet operations
	fleetManager: FleetManager;
	// Planet manager for planet operations
	planetManager: PlanetManager;
};

// Result returned by tool execute functions
export type ToolResult =
	| {success: true; result: Record<string, any>}
	| {success: false; error: string; stack?: string};

// Tool definition with execute, schema, and description
export type Tool<S extends z.ZodObject<any> = z.ZodObject<any>> = {
	description: string;
	schema: S;
	execute: (env: ToolEnvironment, params: z.infer<S>) => Promise<ToolResult>;
};

// Helper function to create a tool with automatic type inference
export function createTool<S extends z.ZodObject<any>>(config: {
	description: string;
	schema: S;
	execute: (env: ToolEnvironment, params: z.infer<S>) => Promise<ToolResult>;
}): Tool<S> {
	return config;
}

// Convert ToolResult to CallToolResult format
export function convertToCallToolResult(result: ToolResult): CallToolResult {
	// Import stringifyWithBigInt to handle BigInt serialization
	const stringifyWithBigInt = (obj: any, space?: number): string => {
		return JSON.stringify(
			obj,
			(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
			space,
		);
	};

	if (result.success === false) {
		return {
			content: [
				{
					type: 'text' as const,
					text: stringifyWithBigInt({
						error: result.error,
						...(result.stack ? {stack: result.stack} : {}),
					}),
				},
			],
			isError: true,
		};
	}

	return {
		content: [
			{
				type: 'text' as const,
				text: stringifyWithBigInt(result.result, 2),
			},
		],
	};
}
