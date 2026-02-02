// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../outerspace/facets/OuterSpaceFacetBase.sol";

contract Combat is OuterSpaceFacetBase {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function computeResolutionResult(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) external view returns (ResolutionState memory, PlanetUpdateState memory) {
        _computeResolutionResult(rState, toPlanetUpdate);

        return (rState, toPlanetUpdate);
    }
}
