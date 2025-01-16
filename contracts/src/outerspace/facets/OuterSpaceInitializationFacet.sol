// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "hardhat-deploy/solc_0.8/diamond/UsingDiamondOwner.sol";

contract OuterSpaceInitializationFacet is OuterSpaceFacetBase {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function init() external {
        if (_discovered.minX == 0) {
            _discovered = Discovered({
                minX: _initialSpaceExpansion,
                maxX: _initialSpaceExpansion,
                minY: _initialSpaceExpansion,
                maxY: _initialSpaceExpansion
            });
            emit BlockTime(block.number, block.timestamp);
            emit Initialized(
                _genesis,
                _resolveWindow,
                _timePerDistance,
                _exitDuration,
                _acquireNumSpaceships,
                _productionSpeedUp,
                _frontrunningDelay,
                _productionCapAsDuration,
                _upkeepProductionDecreaseRatePer10000th,
                _fleetSizeFactor6,
                _initialSpaceExpansion,
                _expansionDelta,
                _giftTaxPer10000
            );
        }

        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[0x80ac58cd] = true;
        ds.supportedInterfaces[0x5b5e139f] = true;
    }
}
