import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  ApprovalForAll,
  BlockTime,
  ExitComplete,
  FleetArrived,
  FleetSent,
  GeneratorAdminChanged,
  GeneratorChanged,
  Initialized,
  PlanetExit,
  PlanetReset,
  PlanetStake,
  PlanetTransfer,
  RewardSetup,
  RewardToWithdraw,
  StakeToWithdraw,
  Transfer,
  TravelingUpkeepRefund,
  DiamondCut,
  OwnershipTransferred
} from "../generated/OuterSpace/OuterSpace"

export function createApprovalForAllEvent(
  owner: Address,
  operator: Address,
  approved: boolean
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = new Array()

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return approvalForAllEvent
}

export function createBlockTimeEvent(
  block: BigInt,
  timestamp: BigInt
): BlockTime {
  let blockTimeEvent = changetype<BlockTime>(newMockEvent())

  blockTimeEvent.parameters = new Array()

  blockTimeEvent.parameters.push(
    new ethereum.EventParam("block", ethereum.Value.fromUnsignedBigInt(block))
  )
  blockTimeEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )

  return blockTimeEvent
}

export function createExitCompleteEvent(
  owner: Address,
  location: BigInt,
  stake: BigInt
): ExitComplete {
  let exitCompleteEvent = changetype<ExitComplete>(newMockEvent())

  exitCompleteEvent.parameters = new Array()

  exitCompleteEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  exitCompleteEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )
  exitCompleteEvent.parameters.push(
    new ethereum.EventParam("stake", ethereum.Value.fromUnsignedBigInt(stake))
  )

  return exitCompleteEvent
}

export function createFleetArrivedEvent(
  fleet: BigInt,
  fleetOwner: Address,
  destinationOwner: Address,
  destination: BigInt,
  gift: boolean,
  won: boolean,
  data: ethereum.Tuple
): FleetArrived {
  let fleetArrivedEvent = changetype<FleetArrived>(newMockEvent())

  fleetArrivedEvent.parameters = new Array()

  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam("fleet", ethereum.Value.fromUnsignedBigInt(fleet))
  )
  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam(
      "fleetOwner",
      ethereum.Value.fromAddress(fleetOwner)
    )
  )
  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam(
      "destinationOwner",
      ethereum.Value.fromAddress(destinationOwner)
    )
  )
  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam(
      "destination",
      ethereum.Value.fromUnsignedBigInt(destination)
    )
  )
  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam("gift", ethereum.Value.fromBoolean(gift))
  )
  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam("won", ethereum.Value.fromBoolean(won))
  )
  fleetArrivedEvent.parameters.push(
    new ethereum.EventParam("data", ethereum.Value.fromTuple(data))
  )

  return fleetArrivedEvent
}

export function createFleetSentEvent(
  fleetSender: Address,
  fleetOwner: Address,
  from: BigInt,
  operator: Address,
  fleet: BigInt,
  quantity: BigInt,
  newNumSpaceships: BigInt,
  newTravelingUpkeep: BigInt,
  newOverflow: BigInt
): FleetSent {
  let fleetSentEvent = changetype<FleetSent>(newMockEvent())

  fleetSentEvent.parameters = new Array()

  fleetSentEvent.parameters.push(
    new ethereum.EventParam(
      "fleetSender",
      ethereum.Value.fromAddress(fleetSender)
    )
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam(
      "fleetOwner",
      ethereum.Value.fromAddress(fleetOwner)
    )
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromUnsignedBigInt(from))
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam("fleet", ethereum.Value.fromUnsignedBigInt(fleet))
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam(
      "newNumSpaceships",
      ethereum.Value.fromUnsignedBigInt(newNumSpaceships)
    )
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam(
      "newTravelingUpkeep",
      ethereum.Value.fromSignedBigInt(newTravelingUpkeep)
    )
  )
  fleetSentEvent.parameters.push(
    new ethereum.EventParam(
      "newOverflow",
      ethereum.Value.fromUnsignedBigInt(newOverflow)
    )
  )

  return fleetSentEvent
}

export function createGeneratorAdminChangedEvent(
  newGeneratorAdmin: Address
): GeneratorAdminChanged {
  let generatorAdminChangedEvent = changetype<GeneratorAdminChanged>(
    newMockEvent()
  )

  generatorAdminChangedEvent.parameters = new Array()

  generatorAdminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newGeneratorAdmin",
      ethereum.Value.fromAddress(newGeneratorAdmin)
    )
  )

  return generatorAdminChangedEvent
}

export function createGeneratorChangedEvent(
  newGenerator: Address
): GeneratorChanged {
  let generatorChangedEvent = changetype<GeneratorChanged>(newMockEvent())

  generatorChangedEvent.parameters = new Array()

  generatorChangedEvent.parameters.push(
    new ethereum.EventParam(
      "newGenerator",
      ethereum.Value.fromAddress(newGenerator)
    )
  )

  return generatorChangedEvent
}

export function createInitializedEvent(
  genesis: Bytes,
  resolveWindow: BigInt,
  timePerDistance: BigInt,
  exitDuration: BigInt,
  acquireNumSpaceships: BigInt,
  productionSpeedUp: BigInt,
  frontrunningDelay: BigInt,
  productionCapAsDuration: BigInt,
  upkeepProductionDecreaseRatePer10000th: BigInt,
  fleetSizeFactor6: BigInt,
  initialSpaceExpansion: BigInt,
  expansionDelta: BigInt,
  giftTaxPer10000: BigInt
): Initialized {
  let initializedEvent = changetype<Initialized>(newMockEvent())

  initializedEvent.parameters = new Array()

  initializedEvent.parameters.push(
    new ethereum.EventParam("genesis", ethereum.Value.fromFixedBytes(genesis))
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "resolveWindow",
      ethereum.Value.fromUnsignedBigInt(resolveWindow)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "timePerDistance",
      ethereum.Value.fromUnsignedBigInt(timePerDistance)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "exitDuration",
      ethereum.Value.fromUnsignedBigInt(exitDuration)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "acquireNumSpaceships",
      ethereum.Value.fromUnsignedBigInt(acquireNumSpaceships)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "productionSpeedUp",
      ethereum.Value.fromUnsignedBigInt(productionSpeedUp)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "frontrunningDelay",
      ethereum.Value.fromUnsignedBigInt(frontrunningDelay)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "productionCapAsDuration",
      ethereum.Value.fromUnsignedBigInt(productionCapAsDuration)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "upkeepProductionDecreaseRatePer10000th",
      ethereum.Value.fromUnsignedBigInt(upkeepProductionDecreaseRatePer10000th)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "fleetSizeFactor6",
      ethereum.Value.fromUnsignedBigInt(fleetSizeFactor6)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "initialSpaceExpansion",
      ethereum.Value.fromUnsignedBigInt(initialSpaceExpansion)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "expansionDelta",
      ethereum.Value.fromUnsignedBigInt(expansionDelta)
    )
  )
  initializedEvent.parameters.push(
    new ethereum.EventParam(
      "giftTaxPer10000",
      ethereum.Value.fromUnsignedBigInt(giftTaxPer10000)
    )
  )

  return initializedEvent
}

export function createPlanetExitEvent(
  owner: Address,
  location: BigInt
): PlanetExit {
  let planetExitEvent = changetype<PlanetExit>(newMockEvent())

  planetExitEvent.parameters = new Array()

  planetExitEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  planetExitEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )

  return planetExitEvent
}

export function createPlanetResetEvent(location: BigInt): PlanetReset {
  let planetResetEvent = changetype<PlanetReset>(newMockEvent())

  planetResetEvent.parameters = new Array()

  planetResetEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )

  return planetResetEvent
}

export function createPlanetStakeEvent(
  acquirer: Address,
  location: BigInt,
  numSpaceships: BigInt,
  travelingUpkeep: BigInt,
  overflow: BigInt,
  stake: BigInt,
  freegift: boolean
): PlanetStake {
  let planetStakeEvent = changetype<PlanetStake>(newMockEvent())

  planetStakeEvent.parameters = new Array()

  planetStakeEvent.parameters.push(
    new ethereum.EventParam("acquirer", ethereum.Value.fromAddress(acquirer))
  )
  planetStakeEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )
  planetStakeEvent.parameters.push(
    new ethereum.EventParam(
      "numSpaceships",
      ethereum.Value.fromUnsignedBigInt(numSpaceships)
    )
  )
  planetStakeEvent.parameters.push(
    new ethereum.EventParam(
      "travelingUpkeep",
      ethereum.Value.fromSignedBigInt(travelingUpkeep)
    )
  )
  planetStakeEvent.parameters.push(
    new ethereum.EventParam(
      "overflow",
      ethereum.Value.fromUnsignedBigInt(overflow)
    )
  )
  planetStakeEvent.parameters.push(
    new ethereum.EventParam("stake", ethereum.Value.fromUnsignedBigInt(stake))
  )
  planetStakeEvent.parameters.push(
    new ethereum.EventParam("freegift", ethereum.Value.fromBoolean(freegift))
  )

  return planetStakeEvent
}

export function createPlanetTransferEvent(
  previousOwner: Address,
  newOwner: Address,
  location: BigInt,
  newNumspaceships: BigInt,
  newTravelingUpkeep: BigInt,
  newOverflow: BigInt
): PlanetTransfer {
  let planetTransferEvent = changetype<PlanetTransfer>(newMockEvent())

  planetTransferEvent.parameters = new Array()

  planetTransferEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  planetTransferEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )
  planetTransferEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )
  planetTransferEvent.parameters.push(
    new ethereum.EventParam(
      "newNumspaceships",
      ethereum.Value.fromUnsignedBigInt(newNumspaceships)
    )
  )
  planetTransferEvent.parameters.push(
    new ethereum.EventParam(
      "newTravelingUpkeep",
      ethereum.Value.fromSignedBigInt(newTravelingUpkeep)
    )
  )
  planetTransferEvent.parameters.push(
    new ethereum.EventParam(
      "newOverflow",
      ethereum.Value.fromUnsignedBigInt(newOverflow)
    )
  )

  return planetTransferEvent
}

export function createRewardSetupEvent(
  location: BigInt,
  giver: Address,
  rewardId: BigInt
): RewardSetup {
  let rewardSetupEvent = changetype<RewardSetup>(newMockEvent())

  rewardSetupEvent.parameters = new Array()

  rewardSetupEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )
  rewardSetupEvent.parameters.push(
    new ethereum.EventParam("giver", ethereum.Value.fromAddress(giver))
  )
  rewardSetupEvent.parameters.push(
    new ethereum.EventParam(
      "rewardId",
      ethereum.Value.fromUnsignedBigInt(rewardId)
    )
  )

  return rewardSetupEvent
}

export function createRewardToWithdrawEvent(
  owner: Address,
  location: BigInt,
  rewardId: BigInt
): RewardToWithdraw {
  let rewardToWithdrawEvent = changetype<RewardToWithdraw>(newMockEvent())

  rewardToWithdrawEvent.parameters = new Array()

  rewardToWithdrawEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  rewardToWithdrawEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )
  rewardToWithdrawEvent.parameters.push(
    new ethereum.EventParam(
      "rewardId",
      ethereum.Value.fromUnsignedBigInt(rewardId)
    )
  )

  return rewardToWithdrawEvent
}

export function createStakeToWithdrawEvent(
  owner: Address,
  newStake: BigInt,
  freegift: boolean
): StakeToWithdraw {
  let stakeToWithdrawEvent = changetype<StakeToWithdraw>(newMockEvent())

  stakeToWithdrawEvent.parameters = new Array()

  stakeToWithdrawEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  stakeToWithdrawEvent.parameters.push(
    new ethereum.EventParam(
      "newStake",
      ethereum.Value.fromUnsignedBigInt(newStake)
    )
  )
  stakeToWithdrawEvent.parameters.push(
    new ethereum.EventParam("freegift", ethereum.Value.fromBoolean(freegift))
  )

  return stakeToWithdrawEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  location: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam(
      "location",
      ethereum.Value.fromUnsignedBigInt(location)
    )
  )

  return transferEvent
}

export function createTravelingUpkeepRefundEvent(
  origin: BigInt,
  fleet: BigInt,
  newNumspaceships: BigInt,
  newTravelingUpkeep: BigInt,
  newOverflow: BigInt
): TravelingUpkeepRefund {
  let travelingUpkeepRefundEvent = changetype<TravelingUpkeepRefund>(
    newMockEvent()
  )

  travelingUpkeepRefundEvent.parameters = new Array()

  travelingUpkeepRefundEvent.parameters.push(
    new ethereum.EventParam("origin", ethereum.Value.fromUnsignedBigInt(origin))
  )
  travelingUpkeepRefundEvent.parameters.push(
    new ethereum.EventParam("fleet", ethereum.Value.fromUnsignedBigInt(fleet))
  )
  travelingUpkeepRefundEvent.parameters.push(
    new ethereum.EventParam(
      "newNumspaceships",
      ethereum.Value.fromUnsignedBigInt(newNumspaceships)
    )
  )
  travelingUpkeepRefundEvent.parameters.push(
    new ethereum.EventParam(
      "newTravelingUpkeep",
      ethereum.Value.fromSignedBigInt(newTravelingUpkeep)
    )
  )
  travelingUpkeepRefundEvent.parameters.push(
    new ethereum.EventParam(
      "newOverflow",
      ethereum.Value.fromUnsignedBigInt(newOverflow)
    )
  )

  return travelingUpkeepRefundEvent
}

export function createDiamondCutEvent(
  _diamondCut: Array<ethereum.Tuple>,
  _init: Address,
  _calldata: Bytes
): DiamondCut {
  let diamondCutEvent = changetype<DiamondCut>(newMockEvent())

  diamondCutEvent.parameters = new Array()

  diamondCutEvent.parameters.push(
    new ethereum.EventParam(
      "_diamondCut",
      ethereum.Value.fromTupleArray(_diamondCut)
    )
  )
  diamondCutEvent.parameters.push(
    new ethereum.EventParam("_init", ethereum.Value.fromAddress(_init))
  )
  diamondCutEvent.parameters.push(
    new ethereum.EventParam("_calldata", ethereum.Value.fromBytes(_calldata))
  )

  return diamondCutEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}
