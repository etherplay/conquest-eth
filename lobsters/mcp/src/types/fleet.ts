import type {Address} from 'viem';

export interface PendingFleet {
	fleetId: string; // Computed from toHash, from, fleetSender, operator
	fromPlanetId: bigint; // Source planet location
	toPlanetId: bigint; // Destination planet location (hidden during commit)
	quantity: number; // Number of spaceships
	secret: `0x${string}`; // Random secret for hash commitment
	gift: boolean; // Whether this is a gift (no combat)
	specific: `0x${string}`; // Specific target address (advanced feature)
	arrivalTimeWanted: bigint; // Preferred arrival time (advanced feature)
	fleetSender: Address; // Address that sent the fleet
	operator: Address; // Address that committed the transaction
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
	specific: Address; // Specific target address
	secret: `0x${string}`; // The secret used to generate the hash
	fleetSender: Address; // Address that sent the fleet
	operator: Address; // Address that committed the transaction
}
