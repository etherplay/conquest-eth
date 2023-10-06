// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../base/ImportingOuterSpaceConstants.sol";
import "../events/ImportingOuterSpaceEvents.sol";
import "../base/UsingOuterSpaceDataLayout.sol";
import "hardhat-deploy/solc_0.8/diamond/UsingDiamondOwner.sol";

contract OuterSpaceInitializationFacet is
    ImportingOuterSpaceConstants,
    ImportingOuterSpaceEvents,
    UsingOuterSpaceDataLayout
{
    bytes32 internal immutable _genesis;
    uint256 internal immutable _resolveWindow;
    uint256 internal immutable _timePerDistance;
    uint256 internal immutable _exitDuration;
    uint32 internal immutable _acquireNumSpaceships;
    uint32 internal immutable _productionSpeedUp;
    uint256 internal immutable _frontrunningDelay;
    uint256 internal immutable _productionCapAsDuration;
    uint256 internal immutable _upkeepProductionDecreaseRatePer10000th;
    uint256 internal immutable _fleetSizeFactor6;
    uint32 internal immutable _expansionDelta; // = 8;
    uint32 internal immutable _initialSpaceExpansion; // = 16;
    uint256 internal immutable _giftTaxPer10000; // = 2500;

    struct Config {
        bytes32 genesis;
        uint256 resolveWindow;
        uint256 timePerDistance;
        uint256 exitDuration;
        uint32 acquireNumSpaceships;
        uint32 productionSpeedUp;
        uint256 frontrunningDelay;
        uint256 productionCapAsDuration;
        uint256 upkeepProductionDecreaseRatePer10000th;
        uint256 fleetSizeFactor6;
        uint32 initialSpaceExpansion;
        uint32 expansionDelta;
        uint256 giftTaxPer10000;
    }

    constructor(Config memory config) {
        uint32 t = uint32(config.timePerDistance) / 4; // the coordinates space is 4 times bigger
        require(t * 4 == config.timePerDistance, "TIME_PER_DIST_NOT_DIVISIBLE_4");

        _genesis = config.genesis;
        _resolveWindow = config.resolveWindow;
        _timePerDistance = t;
        _exitDuration = config.exitDuration;
        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionSpeedUp = config.productionSpeedUp;
        _frontrunningDelay = config.frontrunningDelay;
        _productionCapAsDuration = config.productionCapAsDuration;
        _upkeepProductionDecreaseRatePer10000th = config.upkeepProductionDecreaseRatePer10000th;
        _fleetSizeFactor6 = config.fleetSizeFactor6;
        _initialSpaceExpansion = config.initialSpaceExpansion;
        _expansionDelta = config.expansionDelta;
        _giftTaxPer10000 = config.giftTaxPer10000;
    }

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
