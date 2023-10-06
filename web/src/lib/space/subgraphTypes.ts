import {BigNumber} from '@ethersproject/bignumber';

export type GenericEvent =
  | PlanetStakeEvent
  | PlanetExitEvent
  | PlanetTransferEvent
  | FleetArrivedEvent
  | FleetSentEvent
  | TravelingUpkeepReductionFromDestructionEvent
  | StakeToWithdrawEvent
  | ExitCompleteEvent;

export type GenericParsedEvent =
  | PlanetStakeParsedEvent
  | PlanetExitParsedEvent
  | PlanetTransferParsedEvent
  | FleetArrivedParsedEvent
  | FleetSentParsedEvent
  | TravelingUpkeepReductionFromDestructionParsedEvent
  | StakeToWithdrawParsedEvent
  | ExitCompleteParsedEvent;

export type OwnerEvent = {
  id: string;
  __typename: EventTypeName;
  transaction: {id: string};
  owner: {id: string};
  timestamp: string;
  blockNumber: number;
};

export type OwnerParsedEvent = {
  id: string;
  __typename: EventTypeName;
  transaction: {id: string};
  owner: {id: string};
  timestamp: number;
  blockNumber: number;
};

export type EventTypeName =
  | 'PlanetStakeEvent'
  | 'PlanetExitEvent'
  | 'PlanetTransferEvent'
  | 'FleetSentEvent'
  | 'FleetArrivedEvent'
  | 'TravelingUpkeepReductionFromDestructionEvent'
  | 'StakeToWithdrawEvent'
  | 'ExitCompleteEvent';

export type PlanetEvent = OwnerEvent & {
  planet: {id: string};
};

export type PlanetParsedEvent = OwnerParsedEvent & {
  planet: {id: string};
};

export type PlanetStakeEvent = PlanetEvent & {
  __typename: 'PlanetStakeEvent';
  numSpaceships: string;
  stake: string;
};

export type PlanetStakeParsedEvent = PlanetParsedEvent & {
  __typename: 'PlanetStakeEvent';
  numSpaceships: number;
  stake: BigNumber;
};

export type FleetSentEvent = PlanetEvent & {
  __typename: 'FleetSentEvent';
  sender: {id: string};
  operator: string;
  fleet: {id: string; resolveTransaction?: {id: string}};
  quantity: string;
};

export type FleetSentParsedEvent = PlanetParsedEvent & {
  __typename: 'FleetSentEvent';
  sender: {id: string};
  operator: string;
  fleet: {id: string; resolveTransaction?: {id: string}};
  quantity: number;
};

export type PlanetExitEvent = PlanetEvent & {
  __typename: 'PlanetExitEvent';
  exitTime: string;
  stake: string;
  interupted: boolean;
  complete: boolean;
  success: boolean;
};

export type PlanetExitParsedEvent = PlanetParsedEvent & {
  __typename: 'PlanetExitEvent';
  exitTime: number;
  stake: BigNumber;
  interupted: boolean;
  complete: boolean;
  success: boolean;
};

export type PlanetTransferEvent = PlanetEvent & {
  __typename: 'PlanetTransferEvent';
  newNumspaceships: string;
  newTravelingUpkeep: string;
  newOverflow: string;
  newOwner: {id: string};
};

export type PlanetTransferParsedEvent = PlanetEvent & {
  __typename: 'PlanetTransferEvent';
  newNumspaceships: number;
  newTravelingUpkeep: number;
  newOverflow: number;
  newOwner: {id: string};
};

export type PlanetInteruptedExitEvent = PlanetExitEvent & {
  interupted: true;
};
export type PlanetTimePassedExitEvent = PlanetExitEvent & {
  interupted: false;
};

export type PlanetInteruptedExitParsedEvent = PlanetExitParsedEvent & {
  interupted: true;
};
export type PlanetTimePassedExitParsedEvent = PlanetExitParsedEvent & {
  interupted: false;
};

export type FleetArrivedEvent = PlanetEvent & {
  __typename: 'FleetArrivedEvent';
  sender: {id: string};
  operator: string;
  fleet: {id: string};
  destinationOwner: {id: string};
  gift: boolean;
  taxLoss: string;
  fleetLoss: string;
  planetLoss: string;
  inFlightFleetLoss: string;
  inFlightPlanetLoss: string;
  won: boolean;
  planetActive: boolean;
  newNumspaceships: string;
  newTravelingUpkeep: string;
  newOverflow: string;
  accumulatedDefenseAdded: string;
  accumulatedAttackAdded: string;
  numSpaceshipsAtArrival: string;
  from: {id: string};
  quantity: string;
};

export type FleetArrivedParsedEvent = PlanetParsedEvent & {
  __typename: 'FleetArrivedEvent';
  sender: {id: string};
  operator: string;
  fleet: {id: string};
  destinationOwner: {id: string};
  gift: boolean;
  taxLoss: number;
  fleetLoss: number;
  planetLoss: number;
  inFlightFleetLoss: number;
  inFlightPlanetLoss: number;
  won: boolean;
  planetActive: boolean;
  newNumspaceships: number;
  newTravelingUpkeep: number;
  newOverflow: number;
  accumulatedDefenseAdded: number;
  accumulatedAttackAdded: number;
  numSpaceshipsAtArrival: number;
  from: {id: string};
  quantity: number;
};

export type ExitCompleteEvent = PlanetEvent & {
  __typename: 'ExitCompleteEvent';
  stake: string;
};

export type ExitCompleteParsedEvent = PlanetParsedEvent & {
  __typename: 'ExitCompleteEvent';
  stake: BigNumber;
};

export type StakeToWithdrawEvent = OwnerEvent & {
  __typename: 'StakeToWithdrawEvent';
  newStake: string;
};

export type StakeToWithdrawParsedEvent = OwnerParsedEvent & {
  __typename: 'StakeToWithdrawEvent';
  newStake: BigNumber;
};

export type TravelingUpkeepReductionFromDestructionEvent = PlanetEvent & {
  __typename: 'TravelingUpkeepReductionFromDestructionEvent';
  fleet: {id: string};
  newNumspaceships: string;
  newTravelingUpkeep: string;
  newOverflow: string;
};

export type TravelingUpkeepReductionFromDestructionParsedEvent = PlanetParsedEvent & {
  __typename: 'TravelingUpkeepReductionFromDestructionEvent';
  fleet: {id: string};
  newNumspaceships: number;
  newTravelingUpkeep: number;
  newOverflow: number;
};

export function parseFleetArrived(v: FleetArrivedEvent): FleetArrivedParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    planet: v.planet,
    fleetLoss: parseInt(v.fleetLoss),
    planetLoss: parseInt(v.planetLoss),
    inFlightFleetLoss: parseInt(v.inFlightFleetLoss),
    inFlightPlanetLoss: parseInt(v.inFlightPlanetLoss),
    destinationOwner: v.destinationOwner,
    gift: v.gift,
    fleet: v.fleet,
    from: v.from,
    won: v.won,
    quantity: parseInt(v.quantity),
    newNumspaceships: parseInt(v.newNumspaceships),
    newOverflow: parseInt(v.newOverflow),
    newTravelingUpkeep: parseInt(v.newTravelingUpkeep),
    accumulatedAttackAdded: parseInt(v.accumulatedAttackAdded),
    accumulatedDefenseAdded: parseInt(v.accumulatedDefenseAdded),
    numSpaceshipsAtArrival: parseInt(v.numSpaceshipsAtArrival),
    operator: v.operator,
    planetActive: v.planetActive,
    sender: v.sender,
    taxLoss: parseInt(v.taxLoss),
  };
}

export function parsePlanetExitEvent(v: PlanetExitEvent, interupted: boolean): PlanetExitParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    planet: v.planet,
    stake: BigNumber.from(v.stake),
    exitTime: parseInt(v.exitTime),
    complete: v.complete,
    interupted, // : v.interupted,
    success: v.success,
  };
}

export function parsePlanetTransferEvent(v: PlanetTransferEvent): PlanetTransferParsedEvent {
  console.log({newOwner: v.newOwner});
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    blockNumber: v.blockNumber,
    timestamp: v.timestamp,
    planet: v.planet,
    newNumspaceships: parseInt(v.newNumspaceships),
    newOverflow: parseInt(v.newOverflow),
    newTravelingUpkeep: parseInt(v.newTravelingUpkeep),
    newOwner: v.newOwner,
  };
}

export function parsePlanetInteruptedExitEvent(v: PlanetExitEvent): PlanetInteruptedExitParsedEvent {
  return parsePlanetExitEvent(v, true) as PlanetInteruptedExitParsedEvent;
}

export function parseplanetTimePassedExitEvent(v: PlanetExitEvent): PlanetTimePassedExitParsedEvent {
  return parsePlanetExitEvent(v, false) as PlanetTimePassedExitParsedEvent;
}

export function parsePlanetStakeEvent(v: PlanetStakeEvent): PlanetStakeParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    planet: v.planet,
    numSpaceships: parseInt(v.numSpaceships),
    stake: BigNumber.from(v.stake),
  };
}

export function parseFleetSentEvent(v: FleetSentEvent): FleetSentParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    planet: v.planet,
    fleet: v.fleet,
    quantity: parseInt(v.quantity),
    sender: v.sender,
    operator: v.operator,
  };
}

export function parseTravelingUpkeepReductionFromDestructionEvent(
  v: TravelingUpkeepReductionFromDestructionEvent
): TravelingUpkeepReductionFromDestructionParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    planet: v.planet,
    fleet: v.fleet,
    newNumspaceships: parseInt(v.newNumspaceships),
    newOverflow: parseInt(v.newOverflow),
    newTravelingUpkeep: parseInt(v.newTravelingUpkeep),
  };
}

export function parseStakeToWithdrawEvent(v: StakeToWithdrawEvent): StakeToWithdrawParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    newStake: BigNumber.from(v.newStake),
  };
}

export function parseExitCompleteEvent(v: ExitCompleteEvent): ExitCompleteParsedEvent {
  return {
    id: v.id,
    __typename: v.__typename,
    transaction: v.transaction,
    owner: v.owner,
    timestamp: parseInt(v.timestamp),
    blockNumber: v.blockNumber,
    planet: v.planet,
    stake: BigNumber.from(v.stake),
  };
}

export function parseEvent<T extends EventTypeName>(
  e: (GenericEvent & {__typename: T}) | null
): GenericParsedEvent & {__typename: T} {
  let event: GenericParsedEvent;
  if (e.__typename === 'FleetArrivedEvent') {
    event = parseFleetArrived(e as FleetArrivedEvent);
  } else if (e.__typename === 'PlanetExitEvent') {
    event = parsePlanetExitEvent(e as PlanetExitEvent, (e as PlanetExitEvent).interupted);
  } else if (e.__typename === 'PlanetTransferEvent') {
    event = parsePlanetTransferEvent(e as PlanetTransferEvent);
  } else if (e.__typename === 'PlanetStakeEvent') {
    event = parsePlanetStakeEvent(e as PlanetStakeEvent);
  } else if (e.__typename === 'FleetSentEvent') {
    event = parseFleetSentEvent(e as FleetSentEvent);
  } else if (e.__typename === 'TravelingUpkeepReductionFromDestructionEvent') {
    event = parseTravelingUpkeepReductionFromDestructionEvent(e as TravelingUpkeepReductionFromDestructionEvent);
  } else if (e.__typename === 'StakeToWithdrawEvent') {
    event = parseStakeToWithdrawEvent(e as StakeToWithdrawEvent);
  } else if (e.__typename === 'ExitCompleteEvent') {
    event = parseExitCompleteEvent(e as ExitCompleteEvent);
  } else {
    console.error(`unknown event`, e);
  }
  return event as GenericParsedEvent & {__typename: T};
}
