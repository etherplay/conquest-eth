// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpaceFleetsRead.sol";

contract OuterSpaceFleetsReadFacet is OuterSpaceFacetBase, IOuterSpaceFleetsRead {
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
        launchTime = _fleets[fleetId].launchTime;
        quantity = _fleets[fleetId].quantity & 0x3FFFFFFF;
        owner = _fleets[fleetId].owner;

        uint256 timeSlot = launchTime / (_frontrunningDelay / 2);
        destroyedAtLaunch = _inFlight[from][timeSlot].destroyed;
        flyingAtLaunch = _inFlight[from][timeSlot].flying;
    }
}
