// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpaceFleetsRead.sol";

contract OuterSpaceFleetsReadFacet is
    OuterSpaceFacetBase,
    IOuterSpaceFleetsRead
{
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function getFleet(
        uint256 fleetId,
        uint256 from
    )
        external
        view
        returns (
            address owner,
            uint40 launchTime,
            uint32 quantity,
            uint64 flyingAtLaunch, // can be more than quantity if multiple fleet were launched around the same time from the same planet
            uint64 destroyedAtLaunch
        )
    {
        Fleet memory fleet = _fleets[fleetId];
        launchTime = fleet.launchTime;
        quantity = fleet.quantity >> 31 == 1 ? 0 : fleet.quantity; // keep old behavior
        owner = fleet.owner;

        uint256 timeSlot = launchTime / (_frontrunningDelay / 2);
        destroyedAtLaunch = _inFlight[from][timeSlot].destroyed;
        flyingAtLaunch = _inFlight[from][timeSlot].flying;
    }

    function getFleetData(
        uint256 fleetId,
        uint256 from
    ) external view returns (FleetData memory) {
        Fleet memory fleet = _fleets[fleetId];
        uint256 timeSlot = fleet.launchTime / (_frontrunningDelay / 2);

        return
            FleetData({
                arrived: fleet.quantity >> 31 == 1,
                owner: fleet.owner,
                launchTime: fleet.launchTime,
                quantity: fleet.quantity & 0x3FFFFFFF,
                destroyedAtLaunch: _inFlight[from][timeSlot].destroyed,
                flyingAtLaunch: _inFlight[from][timeSlot].flying,
                defender: fleet.defender,
                arrivalTime: fleet.arrivalTime,
                defenderLoss: fleet.defenderLoss,
                planetActive: fleet.planetActive,
                victory: fleet.victory
            });
    }
}
