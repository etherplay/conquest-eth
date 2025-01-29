// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";
import "../facets/OuterSpaceFacetBase.sol";

interface IOuterSpaceInformation is ImportingOuterSpaceTypes {
    function getGeneisHash() external view returns (bytes32);

    function getConfig() external view returns (OuterSpaceFacetBase.Config memory);

    function getAllianceRegistry() external view returns (AllianceRegistry);

    function getDiscovered() external view returns (Discovered memory);

    function getPlanetStates(
        uint256[] calldata locations
    ) external view returns (ExternalPlanet[] memory planetStates, Discovered memory discovered);
}
