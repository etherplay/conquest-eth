// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpaceFleetsReveal.sol";

contract OuterSpaceFleetsRevealFacet is
    OuterSpaceFacetBase,
    IOuterSpaceFleetsReveal
{
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function resolveFleet(
        uint256 fleetId,
        FleetResolution calldata resolution
    ) external {
        require(
            uint256(
                keccak256(
                    abi.encodePacked(
                        keccak256(
                            abi.encodePacked(
                                resolution.secret,
                                resolution.to,
                                resolution.gift,
                                resolution.specific,
                                resolution.arrivalTimeWanted
                            )
                        ),
                        resolution.from,
                        resolution.fleetSender,
                        resolution.operator
                    )
                )
            ) == fleetId,
            "INVALID_FLEET_DATA_OR_SECRET"
        );
        _resolveFleet(fleetId, resolution);
    }
}
