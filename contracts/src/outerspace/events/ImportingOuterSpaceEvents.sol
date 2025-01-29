// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

interface ImportingOuterSpaceEvents {
    event BlockTime(uint256 block, uint256 timestamp);
    event PlanetStake(
        address indexed acquirer,
        uint256 indexed location,
        uint32 numSpaceships,
        int40 travelingUpkeep,
        uint32 overflow,
        uint256 stake,
        bool freegift
    );
    event FleetSent(
        address indexed fleetSender,
        address indexed fleetOwner,
        uint256 indexed from,
        address operator,
        uint256 fleet,
        uint32 quantity,
        uint32 newNumSpaceships,
        int40 newTravelingUpkeep,
        uint32 newOverflow
    );

    event FleetRevealed(
        uint256 fleetId,
        uint256 from,
        uint256 to,
        uint256 arrivalTimeWanted,
        bool gift,
        address specific,
        bytes32 secret,
        address fleetSender,
        address operator
    );

    struct ArrivalData {
        uint32 newNumspaceships;
        int40 newTravelingUpkeep;
        uint32 newOverflow;
        uint32 numSpaceshipsAtArrival;
        uint32 taxLoss;
        uint32 fleetLoss;
        uint32 planetLoss;
        uint32 inFlightFleetLoss;
        uint32 inFlightPlanetLoss;
        uint32 accumulatedDefenseAdded;
        uint32 accumulatedAttackAdded;
    }

    event FleetArrived(
        uint256 indexed fleet,
        address indexed fleetOwner,
        address indexed destinationOwner,
        uint256 destination,
        bool gift,
        bool won,
        ArrivalData data
    );

    event TravelingUpkeepRefund(
        uint256 indexed origin,
        uint256 indexed fleet,
        uint32 newNumspaceships,
        int40 newTravelingUpkeep,
        uint32 newOverflow
    );

    event PlanetTransfer(
        address indexed previousOwner,
        address indexed newOwner,
        uint256 indexed location,
        uint32 newNumspaceships,
        int40 newTravelingUpkeep,
        uint32 newOverflow
    );

    event PlanetReset(uint256 indexed location);

    event PlanetExit(address indexed owner, uint256 indexed location);

    event ExitComplete(address indexed owner, uint256 indexed location, uint256 stake);

    event RewardSetup(uint256 indexed location, address indexed giver, uint256 rewardId);
    event RewardToWithdraw(address indexed owner, uint256 indexed location, uint256 indexed rewardId);

    event StakeToWithdraw(address indexed owner, uint256 newStake, bool freegift);

    event Initialized(
        bytes32 genesis,
        uint256 resolveWindow,
        uint256 timePerDistance,
        uint256 exitDuration,
        uint32 acquireNumSpaceships,
        uint32 productionSpeedUp,
        uint256 frontrunningDelay,
        uint256 productionCapAsDuration,
        uint256 upkeepProductionDecreaseRatePer10000th,
        uint256 fleetSizeFactor6,
        uint32 initialSpaceExpansion,
        uint32 expansionDelta,
        uint256 giftTaxPer10000
    );

    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    event Transfer(address indexed from, address indexed to, uint256 indexed location);

    event GeneratorChanged(address newGenerator);
    event GeneratorAdminChanged(address newGeneratorAdmin);
}
