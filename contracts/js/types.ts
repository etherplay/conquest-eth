// object including both planet id and global coordinates
export type PlanetLocation = {
	id: bigint;
	x: number; // not needed ?
	y: number; // not needed ?
	globalX: number;
	globalY: number;
};

export type TxStatus = {
	finalized: boolean;
	status: 'Pending' | 'Success' | 'Cancelled' | 'Failure' | 'Mined';
};

// object describing the static attributes of a planet // do not change
export type Statistics = {
	name: string;
	stake: number;
	production: number;
	attack: number;
	defense: number;
	speed: number;
	natives: number;
	subX: number;
	subY: number;
	cap: number;
	maxTravelingUpkeep: number;
};

// object representing a planet with only static attributes // do not change
export type PlanetInfo = {
	location: PlanetLocation;
	type: number;
	stats: Statistics;
};

// object representing the state of the planet // change over time and through actions
export type PlanetState = {
	owner?: string;
	ownerYakuzaSubscriptionEndTime: number;
	lastUpdatedSaved: number; // updated
	startExitTime: number;
	numSpaceships: number;
	flagTime: number;
	travelingUpkeep: number;
	overflow: number;
	active: boolean;
	exiting: boolean;
	exitTimeLeft: number;
	natives: boolean;
	capturing: boolean; // TODO add error state
	inReach: boolean;
	rewardGiver: string;
	requireClaimAcknowledgement?: string;
	metadata: Record<string, string | number | boolean>;
};
