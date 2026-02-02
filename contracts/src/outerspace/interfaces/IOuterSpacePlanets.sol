// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";
import "../events/ImportingOuterSpaceEvents.sol";

interface IOuterSpacePlanets is
    ImportingOuterSpaceTypes,
    ImportingOuterSpaceEvents
{
    function setApprovalForAll(address operator, bool approved) external;

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);

    function ownerOf(uint256 location) external view returns (address);

    function safeTransferFrom(
        address from,
        address to,
        uint256 location
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 location,
        bytes calldata data
    ) external;

    function transferFrom(address from, address to, uint256 location) external;

    function ownerAndOwnershipStartTimeOf(
        uint256 location
    ) external view returns (address owner, uint40 ownershipStartTime);

    function getPlanet(
        uint256 location
    )
        external
        view
        returns (ExternalPlanet memory state, PlanetStats memory stats);

    function getPlanetState(
        uint256 location
    ) external view returns (ExternalPlanet memory state);

    function getUpdatedPlanetState(
        uint256 location
    ) external view returns (ExternalPlanet memory state);
}
