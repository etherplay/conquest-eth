// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";
import "../events/ImportingOuterSpaceEvents.sol";

interface IOuterSpaceFleets is ImportingOuterSpaceTypes, ImportingOuterSpaceEvents {
    function resolveFleet(uint256 fleetId, FleetResolution calldata resolution) external;

    function send(
        uint256 from,
        uint32 quantity,
        bytes32 toHash
    ) external;

    function sendFor(FleetLaunch calldata launch) external;

    function getFleet(uint256 fleetId, uint256 from)
        external
        view
        returns (
            address owner,
            uint40 launchTime,
            uint32 quantity,
            uint64 flyingAtLaunch, // can be more than quantity if multiple fleet were launched around the same time from the same planet
            uint64 destroyedAtLaunch
        );
}
