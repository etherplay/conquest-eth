import type {Address} from 'viem';
import type {PlanetInfo} from 'conquest-eth-v0-contracts';

// ExternalPlanet is the contract return type from getPlanetStates
export interface ExternalPlanet {
	// owner?: Address;
	// ownerYakuzaSubscriptionEndTime: number;
	// lastUpdatedSaved: number;
	// startExitTime: number;
	// numSpaceships: number;
	// flagTime: number;
	// travelingUpkeep: number;
	// overflow: number;
	// active: boolean;
	// exiting: boolean;
	// exitTimeLeft: number;
	// natives: boolean;
	// capturing: boolean;
	// inReach: boolean;
	// rewardGiver: Address;
	// requireClaimAcknowledgement?: Address;
	// metadata: Record<string, string | number | boolean>;
	owner: `0x${string}`;
	ownershipStartTime: number;
	exitStartTime: number;
	numSpaceships: number;
	overflow: number;
	lastUpdated: number;
	active: boolean;
	reward: bigint;
}

export interface PendingExit {
	planetId: bigint; // Planet location ID
	player: Address; // Player who initiated the exit
	exitStartTime: number; // Timestamp when exit was initiated
	exitDuration: number; // Duration of exit process (typically 7 days)
	exitCompleteTime: number; // When exit will complete
	numSpaceships: number; // Spaceships on planet at exit start
	owner: Address; // Current owner (may change due to attacks)
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
