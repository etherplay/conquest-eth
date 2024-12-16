// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";
import "../events/ImportingOuterSpaceEvents.sol";

interface IOuterSpaceFleetsReveal is ImportingOuterSpaceTypes, ImportingOuterSpaceEvents {
    function resolveFleet(uint256 fleetId, FleetResolution calldata resolution) external;
}
