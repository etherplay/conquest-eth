// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";
import "../base/ImportingOuterSpaceConstants.sol";
import "../events/ImportingOuterSpaceEvents.sol";
import "../base/UsingOuterSpaceDataLayout.sol";

import "../../libraries/Extraction.sol";
import "../../libraries/Math.sol";

import "../../interfaces/IAlliance.sol";
import "../../alliances/AllianceRegistry.sol";

import "../../conquest_token/IFreePlayToken.sol";

interface StakingToken is IERC20 {
    function mint(address to, uint256 amount) external payable;
}

contract OuterSpaceFacetBase is
    ImportingOuterSpaceTypes,
    ImportingOuterSpaceConstants,
    ImportingOuterSpaceEvents,
    UsingOuterSpaceDataLayout
{
    using Extraction for bytes32;

    StakingToken internal immutable _stakingToken;
    IFreePlayToken internal immutable _freeStakingToken;
    AllianceRegistry internal immutable _allianceRegistry;

    bytes32 internal immutable _genesis;
    uint256 internal immutable _resolveWindow;
    uint256 internal immutable _timePerDistance;
    uint256 internal immutable _exitDuration;
    uint32 internal immutable _acquireNumSpaceships; // TODO use uint256
    uint32 internal immutable _productionSpeedUp; // TODO use uint256
    uint256 internal immutable _frontrunningDelay;
    uint256 internal immutable _productionCapAsDuration;
    uint256 internal immutable _upkeepProductionDecreaseRatePer10000th;
    uint256 internal immutable _fleetSizeFactor6;
    uint32 internal immutable _initialSpaceExpansion; // = 16;
    uint32 internal immutable _expansionDelta; // = 8;  // TODO use uint256
    uint256 internal immutable _giftTaxPer10000; // = 2500;
    // // 4,5,5,10,10,15,15, 20, 20, 30,30,40,40,80,80,100
    // bytes32 constant stakeRange = 0x000400050005000A000A000F000F00140014001E001E00280028005000500064;
    // 6, 8, 10, 12, 14, 16, 18, 20, 20, 22, 24, 32, 40, 48, 56, 72
    // bytes32 internal constant stakeRange = 0x00060008000A000C000E00100012001400140016001800200028003000380048;
    bytes32 internal immutable _stakeRange;
    uint256 internal immutable _stakeMultiplier10000th;
    uint256 internal immutable _bootstrapSessionEndTime;
    uint256 internal immutable _infinityStartTime;

    struct Config {
        StakingToken stakingToken;
        IFreePlayToken freeStakingToken;
        AllianceRegistry allianceRegistry;
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
        bytes32 stakeRange;
        uint256 stakeMultiplier10000th;
        uint256 bootstrapSessionEndTime;
        uint256 infinityStartTime;
    }

    constructor(Config memory config) {
        uint32 t = uint32(config.timePerDistance) / 4; // the coordinates space is 4 times bigger
        require(
            t * 4 == config.timePerDistance,
            "TIME_PER_DIST_NOT_DIVISIBLE_4"
        );

        _stakingToken = config.stakingToken;
        _freeStakingToken = config.freeStakingToken;
        _allianceRegistry = config.allianceRegistry;

        _genesis = config.genesis;
        _resolveWindow = config.resolveWindow;
        _timePerDistance = t;
        _exitDuration = config.exitDuration;
        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionSpeedUp = config.productionSpeedUp;
        _frontrunningDelay = config.frontrunningDelay;
        _productionCapAsDuration = config.productionCapAsDuration;
        _upkeepProductionDecreaseRatePer10000th = config
            .upkeepProductionDecreaseRatePer10000th;
        _fleetSizeFactor6 = config.fleetSizeFactor6;
        _initialSpaceExpansion = config.initialSpaceExpansion;
        _expansionDelta = config.expansionDelta;
        _giftTaxPer10000 = config.giftTaxPer10000;
        _stakeRange = config.stakeRange;
        _stakeMultiplier10000th = config.stakeMultiplier10000th;
        _bootstrapSessionEndTime = config.bootstrapSessionEndTime;
        _infinityStartTime = config.infinityStartTime;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // PLANET STATE
    // ---------------------------------------------------------------------------------------------------------------

    struct PlanetUpdateState {
        uint256 location;
        uint40 lastUpdated;
        bool active; // modified
        uint32 numSpaceships; // modified
        int40 travelingUpkeep; // modified
        uint40 exitStartTime;
        uint40 newExitStartTime; // modified
        uint32 overflow; // modified
        address owner;
        address newOwner; // modified
        bytes32 data;
        uint24 futureExtraProduction;
    }

    function _createPlanetUpdateState(
        Planet memory planet,
        uint256 location
    ) internal view returns (PlanetUpdateState memory planetUpdate) {
        (bool active, uint32 currentNumSpaceships) = _activeNumSpaceships(
            planet.numSpaceships
        );
        planetUpdate.location = location;
        planetUpdate.lastUpdated = planet.lastUpdated;
        planetUpdate.active = active;
        planetUpdate.numSpaceships = currentNumSpaceships;
        planetUpdate.travelingUpkeep = planet.travelingUpkeep;
        planetUpdate.exitStartTime = planet.exitStartTime;
        planetUpdate.newExitStartTime = planet.exitStartTime;
        planetUpdate.overflow = planet.overflow;
        planetUpdate.owner = planet.owner;
        planetUpdate.newOwner = planet.owner;
        planetUpdate.data = _planetData(location);
    }

    // solhint-disable-next-line code-complexity
    function _computePlanetUpdateForTimeElapsed(
        PlanetUpdateState memory planetUpdate
    ) internal view {
        if (planetUpdate.exitStartTime != 0) {
            if (_hasJustExited(planetUpdate.exitStartTime)) {
                planetUpdate.newExitStartTime = 0;
                planetUpdate.numSpaceships = 0;
                planetUpdate.travelingUpkeep = 0;
                planetUpdate.newOwner = address(0);
                planetUpdate.overflow = 0;
                planetUpdate.active = false; // event is emitted at the endof each write function
                // lastUpdated is set at the end directly on storage
                return;
            }
        }

        uint256 timePassed = block.timestamp - planetUpdate.lastUpdated;
        uint16 production = _production(planetUpdate.data);
        uint256 amountProducedTheWholeTime = (timePassed *
            uint256(_productionSpeedUp) *
            uint256(production)) / 1 hours;

        uint256 newNumSpaceships = planetUpdate.numSpaceships;
        uint256 extraUpkeepPaid = 0;
        if (_productionCapAsDuration > 0) {
            uint256 capWhenActive = _capWhenActive(production);
            uint256 cap = planetUpdate.active ? capWhenActive : 0;

            if (newNumSpaceships > cap) {
                uint256 decreaseRate = 1800;
                if (planetUpdate.overflow > 0) {
                    decreaseRate =
                        (uint256(planetUpdate.overflow) * 1800) / capWhenActive;
                    if (decreaseRate < 1800) {
                        decreaseRate = 1800;
                    }
                }

                uint256 decrease = (timePassed *
                    uint256(_productionSpeedUp) *
                    decreaseRate) / 1 hours;
                if (decrease == 0) {
                    // NOTE: To ensure a player cannot simply ping the planet continuously to avoid the decrease
                    decrease = 1;
                }
                if (decrease > newNumSpaceships - cap) {
                    decrease = newNumSpaceships - cap;
                }

                if (planetUpdate.active) {
                    extraUpkeepPaid = decrease;
                }
                newNumSpaceships -= decrease;
            } else {
                if (planetUpdate.active) {
                    uint256 increase = amountProducedTheWholeTime;
                    if (planetUpdate.travelingUpkeep > 0) {
                        uint256 timeBeforeUpkeepBackToZero = (uint256(
                            uint40(planetUpdate.travelingUpkeep)
                        ) * 1 hours) /
                            ((uint256(_productionSpeedUp) *
                                uint256(production) *
                                _upkeepProductionDecreaseRatePer10000th) /
                                10000); // 10,000 should be extracted as to not reach div by zero (like "1 hours")
                        if (timeBeforeUpkeepBackToZero >= timePassed) {
                            extraUpkeepPaid = increase;
                        } else {
                            extraUpkeepPaid =
                                (timeBeforeUpkeepBackToZero *
                                    uint256(_productionSpeedUp) *
                                    uint256(production)) / 1 hours;
                            if (extraUpkeepPaid > increase) {
                                extraUpkeepPaid = increase; // TODO remove ? should not be possible
                            }
                        }
                        increase -= extraUpkeepPaid;
                    }

                    uint256 maxIncrease = cap - newNumSpaceships;
                    if (increase > maxIncrease) {
                        extraUpkeepPaid += increase - maxIncrease;
                        increase = maxIncrease;
                    }
                    newNumSpaceships += increase;
                    // solhint-disable-next-line no-empty-blocks
                } else {
                    // not effect currently, when inactive, cap == 0, meaning zero spaceship here
                    // NOTE: we could do the following assuming we act on upkeepRepaid when inactive, we do not do that currently
                    //  extraUpkeepPaid = amountProducedTheWholeTime - upkeepRepaid;
                }
            }

            if (planetUpdate.active) {
                uint256 upkeepRepaid = ((amountProducedTheWholeTime *
                    _upkeepProductionDecreaseRatePer10000th) / 10000) +
                    extraUpkeepPaid;
                int256 newTravelingUpkeep = int256(
                    planetUpdate.travelingUpkeep
                ) - int40(uint40(upkeepRepaid));

                if (newTravelingUpkeep < -int256(cap)) {
                    newTravelingUpkeep = -int256(cap);
                }
                planetUpdate.travelingUpkeep = int40(newTravelingUpkeep);
            }
        } else {
            // TODO We are not using this branch, and in that branch there is no upkeep or overflow to consider
            if (planetUpdate.active) {
                newNumSpaceships += amountProducedTheWholeTime;
            } else {
                // NOTE no need to overflow here  as there is no production cap, so no incentive to regroup spaceships
                uint256 decrease = (timePassed *
                    uint256(_productionSpeedUp) *
                    1800) / 1 hours;
                if (decrease > newNumSpaceships) {
                    decrease = newNumSpaceships;
                    newNumSpaceships = 0;
                } else {
                    newNumSpaceships -= decrease;
                }
            }
        }

        if (newNumSpaceships >= ACTIVE_MASK) {
            newNumSpaceships = ACTIVE_MASK - 1;
        }
        planetUpdate.numSpaceships = uint32(newNumSpaceships);

        if (!planetUpdate.active && planetUpdate.numSpaceships == 0) {
            planetUpdate.newOwner = address(0);
        }
    }

    function _setPlanet(
        Planet storage planet,
        PlanetUpdateState memory planetUpdate,
        bool exitInterupted
    ) internal {
        if (
            planetUpdate.exitStartTime > 0 && planetUpdate.newExitStartTime == 0
        ) {
            // NOTE: planetUpdate.newExitStartTime is only set to zero when exit is actually complete (not interupted)
            //  interuption is handled by exitInterupted
            // exit has completed, newExitStartTime is not set to zero for interuption,
            // interuption is taken care below (owner changes)
            _handleExitComplete(planetUpdate);
        }
        if (planetUpdate.owner != planetUpdate.newOwner) {
            planet.owner = planetUpdate.newOwner;
            if (planetUpdate.newOwner != address(0)) {
                planet.ownershipStartTime = uint40(block.timestamp);
            } else {
                planet.ownershipStartTime = 0;
            }
            emit Transfer(
                planetUpdate.owner,
                planetUpdate.newOwner,
                planetUpdate.location
            );
        }

        if (exitInterupted) {
            // if (planetUpdate.newExitStartTime == 0 && planetUpdate.exitStartTime > 0) {
            // exit interupted // TODO event ?
            // }
            planet.exitStartTime = 0;
        } else if (
            planetUpdate.newExitStartTime != planetUpdate.exitStartTime
        ) {
            planet.exitStartTime = planetUpdate.newExitStartTime;
        }

        planet.numSpaceships = _setActiveNumSpaceships(
            planetUpdate.active,
            planetUpdate.numSpaceships
        );
        planet.travelingUpkeep = planetUpdate.travelingUpkeep;

        planet.overflow = planetUpdate.overflow;
        planet.lastUpdated = uint40(block.timestamp);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // STAKING / PRODUCTION CAPTURE
    // ---------------------------------------------------------------------------------------------------------------

    function _acquire(
        address player,
        uint256 stake,
        uint256 location,
        bool freegift
    ) internal whenNotPaused {
        // -----------------------------------------------------------------------------------------------------------
        // Initialise State Update
        // -----------------------------------------------------------------------------------------------------------
        Planet storage planet = _getPlanet(location);
        PlanetUpdateState memory planetUpdate = _createPlanetUpdateState(
            planet,
            location
        );

        // -----------------------------------------------------------------------------------------------------------
        // check requirements
        // -----------------------------------------------------------------------------------------------------------
        require(
            stake == uint256(_stake(planetUpdate.data)) * (DECIMALS_14),
            "INVALID_STAKE_AMOUNT"
        );

        // -----------------------------------------------------------------------------------------------------------
        // Compute Basic Planet Updates
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForTimeElapsed(planetUpdate);

        // -----------------------------------------------------------------------------------------------------------
        // Staking logic...
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForStaking(player, planetUpdate);

        // -----------------------------------------------------------------------------------------------------------
        // Write New State
        // -----------------------------------------------------------------------------------------------------------
        _setPlanet(planet, planetUpdate, false);
        // _setAccountFromPlanetUpdate(planetUpdate);

        // -----------------------------------------------------------------------------------------------------------
        // Update Space Discovery
        // -----------------------------------------------------------------------------------------------------------
        _setDiscoveryAfterStaking(location);

        if (freegift) {
            _planetFlagged[location] = block.timestamp;
        } else {
            _planetFlagged[location] = 0; // staked with normal tokens
        }

        // -----------------------------------------------------------------------------------------------------------
        // Emit Event
        // -----------------------------------------------------------------------------------------------------------
        emit BlockTime(block.number, block.timestamp);
        emit PlanetStake(
            player,
            location,
            planetUpdate.numSpaceships,
            planetUpdate.travelingUpkeep,
            planetUpdate.overflow,
            stake,
            freegift
        );
        _notifyGeneratorAdd(planetUpdate.newOwner, stake);
    }

    function _computePlanetUpdateForStaking(
        address player,
        PlanetUpdateState memory planetUpdate
    ) internal view {
        require(!planetUpdate.active, "STILL_ACTIVE");

        uint32 defense;
        // NOTE : natives are back automatically once spaceships reaches zero (here we know we are not active)
        // TODO consider making natives come back over time => would need to compute the time numSpaceship became zero
        if (planetUpdate.numSpaceships == 0) {
            defense = _natives(planetUpdate.data);
        } else {
            // Do not allow staking over occupied planets, they are going to zero at some point though
            require(planetUpdate.owner == player, "OCCUPIED");
        }

        uint16 production = _production(planetUpdate.data);
        uint32 cap = uint32(_capWhenActive(production));

        // We need to  ensure a player staking on a planet it previously exited work here
        planetUpdate.newOwner = player;
        if (defense != 0) {
            (uint32 attackerLoss, ) = _computeFight(
                uint256(_acquireNumSpaceships),
                defense,
                10000,
                _defense(planetUpdate.data)
            );
            // attacker alwasy win as defense (and stats.native) is restricted to 3500
            // (attackerLoss: 0, defenderLoss: 0) would mean defense was zero
            require(attackerLoss < _acquireNumSpaceships, "FAILED_CAPTURED");
            planetUpdate.numSpaceships = _acquireNumSpaceships - attackerLoss;

            // NOTE cannot be overflow here as staking provide a number of spaceships below that
            planetUpdate.overflow = 0;
        } else {
            planetUpdate.numSpaceships += _acquireNumSpaceships;
            if (_productionCapAsDuration > 0) {
                if (planetUpdate.numSpaceships > cap) {
                    planetUpdate.overflow = planetUpdate.numSpaceships - cap;
                } else {
                    planetUpdate.overflow = 0;
                }
            }
        }

        // NOTE when staking on a planet, we set an allowance for traveling upkeep
        planetUpdate.travelingUpkeep =
            -int32(
                uint32(
                    (uint256(cap) * _upkeepProductionDecreaseRatePer10000th) /
                        10000
                )
            ) - int32(planetUpdate.numSpaceships);
        planetUpdate.active = true;
    }

    // solhint-disable-next-line code-complexity
    function _setDiscoveryAfterStaking(uint256 location) internal {
        Discovered memory discovered = _discovered;

        int256 x = int256(
            int128(int256(location & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF))
        );
        int256 y = int256(int128(int256(location >> 128)));

        bool changes = false;
        if (x < 0) {
            require(
                -x <= int256(uint256(discovered.minX)),
                "NOT_REACHABLE_YET_MINX"
            );
            x = -x + int32(_expansionDelta);
            if (x > UINT32_MAX) {
                x = UINT32_MAX;
            }
            if (int256(uint256(discovered.minX)) < x) {
                discovered.minX = uint32(uint256(x));
                changes = true;
            }
        } else {
            require(
                x <= int256(uint256(discovered.maxX)),
                "NOT_REACHABLE_YET_MAXX"
            );
            x = x + int32(_expansionDelta);
            if (x > UINT32_MAX) {
                x = UINT32_MAX;
            }
            if (discovered.maxX < uint32(uint256(x))) {
                discovered.maxX = uint32(uint256(x));
                changes = true;
            }
        }

        if (y < 0) {
            require(
                -y <= int256(uint256(discovered.minY)),
                "NOT_REACHABLE_YET_MINY"
            );
            y = -y + int32(_expansionDelta);
            if (y > UINT32_MAX) {
                y = UINT32_MAX;
            }
            if (int256(uint256(discovered.minY)) < y) {
                discovered.minY = uint32(uint256(y));
                changes = true;
            }
        } else {
            require(
                y <= int256(uint256(discovered.maxY)),
                "NOT_REACHABLE_YET_MAXY"
            );
            y = y + int32(_expansionDelta);
            if (y > UINT32_MAX) {
                y = UINT32_MAX;
            }
            if (int256(uint256(discovered.maxY)) < y) {
                discovered.maxY = uint32(uint256(y));
                changes = true;
            }
        }
        if (changes) {
            _discovered = discovered;
        }
    }

    // ---------------------------------------------------------------------------------------------------------------
    // EXITS / WITHDRAWALS
    // ---------------------------------------------------------------------------------------------------------------

    function _handleExitComplete(
        PlanetUpdateState memory planetUpdate
    ) internal {
        uint256 stake = _completeExit(
            planetUpdate.owner,
            planetUpdate.location,
            planetUpdate.data
        );

        // Note we could Transfer to zero and Transfer from zero ?

        // optional so we can use it in the batch withdraw,

        uint256 flagTime = _planetFlagged[planetUpdate.location];
        if (flagTime > 0) {
            // TODO reactivate once we siwtch to a fixed FreePlayToken
            // if (planetUpdate.exitStartTime >= flagTime + (6 days / _productionSpeedUp)) {
            //     _freeStakingToken.burn(address(this), address(this), stake);
            //     uint256 newStake = _stakeReadyToBeWithdrawn[planetUpdate.owner] + stake;
            //     _stakeReadyToBeWithdrawn[planetUpdate.owner] = newStake;
            //     emit StakeToWithdraw(planetUpdate.owner, newStake, false);
            // } else {
            uint256 newStake = _freeStakeReadyToBeWithdrawn[
                planetUpdate.owner
            ] + stake;
            _freeStakeReadyToBeWithdrawn[planetUpdate.owner] = newStake;
            emit StakeToWithdraw(planetUpdate.owner, newStake, true);
            // }
        } else {
            uint256 newStake = _stakeReadyToBeWithdrawn[planetUpdate.owner] +
                stake;
            _stakeReadyToBeWithdrawn[planetUpdate.owner] = newStake;
            emit StakeToWithdraw(planetUpdate.owner, newStake, false);
        }
    }

    function _completeExit(
        address owner,
        uint256 location,
        bytes32 data
    ) internal returns (uint256 stake) {
        stake = uint256(_stake(data)) * (DECIMALS_14);
        emit BlockTime(block.number, block.timestamp);
        emit ExitComplete(owner, location, stake);

        // --------------------------------------------------------
        // Extra Reward was added
        // --------------------------------------------------------
        uint256 rewardId = _rewards[location];
        if (rewardId != 0) {
            // rewardId would contains the package. maybe this could be handled by an external contract
            _rewardsToWithdraw[owner][rewardId] = true;
            _rewards[location] = 0; // reset
            // if you had reward to a planet in he process of exiting,
            // you are adding the reward to the player exiting unless _setPlanetAfterExit is called first
            emit RewardToWithdraw(owner, location, rewardId);
        }
        // --------------------------------------------------------
    }

    function _unsafe_exit_for(address owner, uint256 location) internal {
        Planet storage planet = _getPlanet(location);
        (bool active, ) = _activeNumSpaceships(planet.numSpaceships);
        require(active, "NOT_ACTIVE");
        require(owner == planet.owner, "NOT_OWNER");
        require(planet.exitStartTime == 0, "EXITING_ALREADY");

        planet.exitStartTime = uint40(block.timestamp);
        emit BlockTime(block.number, block.timestamp);
        emit PlanetExit(owner, location);

        // stake is removed as soon as we start exist
        // If the exit is interupted, it is given to the player interupting
        _notifyGeneratorRemove(
            owner,
            uint256(_stake(_planetData(location))) * (DECIMALS_14)
        );
    }

    function _fetchAndWithdrawFor(
        address owner,
        uint256[] calldata locations
    ) internal {
        uint256 addedStake = 0;
        uint256 freeAddedStake = 0;
        for (uint256 i = 0; i < locations.length; i++) {
            Planet storage planet = _getPlanet(locations[i]);
            if (_hasJustExited(planet.exitStartTime)) {
                require(owner == planet.owner, "NOT_OWNER");
                emit Transfer(owner, address(0), locations[i]);

                uint256 flagTime = _planetFlagged[locations[i]];
                if (flagTime > 0) {
                    // TODO reactivate once we siwtch to a fixed FreePlayToken
                    // if (planet.exitStartTime >= flagTime + (6 days / _productionSpeedUp)) {
                    //     uint256 extra = _completeExit(planet.owner, locations[i], _planetData(locations[i]));
                    //     addedStake += extra;
                    //     _freeStakingToken.burn(address(this), address(this), extra);
                    // } else {
                    freeAddedStake += _completeExit(
                        planet.owner,
                        locations[i],
                        _planetData(locations[i])
                    );
                    // }
                } else {
                    addedStake += _completeExit(
                        planet.owner,
                        locations[i],
                        _planetData(locations[i])
                    );
                }

                planet.owner = address(0);
                planet.ownershipStartTime = 0;
                planet.exitStartTime = 0;
                planet.numSpaceships = 0;
                planet.overflow = 0;
                planet.travelingUpkeep = 0;
                planet.lastUpdated = uint40(block.timestamp);
            }
        }
        uint256 newStake = _stakeReadyToBeWithdrawn[owner] + addedStake;
        _unsafe_withdrawAll(owner, newStake);

        uint256 newFreeStake = _freeStakeReadyToBeWithdrawn[owner] +
            freeAddedStake;
        _free_unsafe_withdrawAll(owner, newFreeStake);
    }

    function _unsafe_withdrawAll(address owner, uint256 amount) internal {
        _stakeReadyToBeWithdrawn[owner] = 0;
        emit StakeToWithdraw(owner, amount, false);
        require(_stakingToken.transfer(owner, amount), "FAILED_TRANSFER");
        emit StakeToWithdraw(owner, 0, false);
    }

    function _free_unsafe_withdrawAll(address owner, uint256 amount) internal {
        _freeStakeReadyToBeWithdrawn[owner] = 0;
        emit StakeToWithdraw(owner, amount, true);
        require(_freeStakingToken.transfer(owner, amount), "FAILED_TRANSFER");
        emit StakeToWithdraw(owner, 0, true);
    }

    function _hasJustExited(uint40 exitTime) internal view returns (bool) {
        if (exitTime == 0) {
            return false;
        }
        uint256 timestamp = block.timestamp;
        if (
            _bootstrapSessionEndTime > 0 &&
            timestamp >= _bootstrapSessionEndTime &&
            exitTime < _infinityStartTime
        ) {
            return true;
        }

        return timestamp > exitTime + _exitDuration;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // REWARDS
    // ---------------------------------------------------------------------------------------------------------------

    function _addReward(uint256 location, address sponsor) internal {
        uint256 rewardId = _rewards[location];
        require(rewardId == 0, "REWARD_ALREADY_AT_THIS_LOCATION");
        // TODO ?
        // Planet storage planet = _getPlanet(location);
        // require(planet.lastUpdated == 0, "PLANET_ALREADY_COLONIZED");
        rewardId = ++_prevRewardIds[sponsor];
        _rewards[location] = (uint256(uint160(sponsor)) << 96) + rewardId;
        emit RewardSetup(location, sponsor, rewardId);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // FLEET SENDING
    // ---------------------------------------------------------------------------------------------------------------

    function _unsafe_sendFor(
        uint256 fleetId,
        address operator,
        FleetLaunch memory launch
    ) internal whenNotPaused {
        // -----------------------------------------------------------------------------------------------------------
        // Initialise State Update
        // -----------------------------------------------------------------------------------------------------------
        Planet storage planet = _getPlanet(launch.from);
        PlanetUpdateState memory planetUpdate = _createPlanetUpdateState(
            planet,
            launch.from
        );

        // -----------------------------------------------------------------------------------------------------------
        // check requirements
        // -----------------------------------------------------------------------------------------------------------

        require(launch.quantity < 2 ** 30, "TOO_MANY_SPACESHIPS"); // only 2^30 because the first 2 bits = resolution
        require(launch.quantity > 0, "NO_SPACESHIPS");
        require(planet.exitStartTime == 0, "PLANET_EXIT");
        require(launch.fleetSender == planet.owner, "NOT_OWNER");

        // -----------------------------------------------------------------------------------------------------------
        // Compute Basic Planet Updates
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForTimeElapsed(planetUpdate);

        // -----------------------------------------------------------------------------------------------------------
        // Requirements post Planet Updates
        // -----------------------------------------------------------------------------------------------------------

        require(
            planetUpdate.numSpaceships >= launch.quantity,
            "SPACESHIPS_NOT_ENOUGH"
        );

        // -----------------------------------------------------------------------------------------------------------
        // Sending logic...
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForFleetLaunch(planetUpdate, launch.quantity);

        // -----------------------------------------------------------------------------------------------------------
        // Write New State
        // -----------------------------------------------------------------------------------------------------------
        _setPlanet(planet, planetUpdate, false);
        // _setAccountFromPlanetUpdate(planetUpdate);

        _setFleetFlyingSlot(launch.from, launch.quantity);

        require(_fleets[fleetId].quantity == 0, "FLEET_EXISTS");
        _fleets[fleetId] = Fleet({
            launchTime: uint40(block.timestamp),
            owner: launch.fleetOwner,
            quantity: launch.quantity,
            futureExtraProduction: planetUpdate.futureExtraProduction,
            defender: address(0),
            arrivalTime: 0,
            defenderLoss: 0,
            victory: false,
            planetActive: false
        });

        emit BlockTime(block.number, block.timestamp);
        emit FleetSent(
            launch.fleetSender,
            launch.fleetOwner,
            launch.from,
            operator,
            fleetId,
            launch.quantity,
            planetUpdate.numSpaceships,
            planetUpdate.travelingUpkeep,
            planetUpdate.overflow
        );
    }

    function _computePlanetUpdateForFleetLaunch(
        PlanetUpdateState memory planetUpdate,
        uint32 quantity
    ) internal view {
        planetUpdate.numSpaceships -= quantity;
        if (_productionCapAsDuration > 0) {
            if (planetUpdate.active) {
                // NOTE we do not update travelingUpkeep on Inactive planets
                //  these get reset on staking

                uint16 production = _production(planetUpdate.data);
                uint256 cap = _capWhenActive(production);
                if (planetUpdate.numSpaceships < cap) {
                    uint256 futureExtraProduction = cap -
                        planetUpdate.numSpaceships;
                    if (futureExtraProduction > quantity) {
                        futureExtraProduction = quantity;
                    }
                    int256 newTravelingUpkeep = int256(
                        planetUpdate.travelingUpkeep
                    ) + int256(futureExtraProduction);
                    if (newTravelingUpkeep > int256(cap)) {
                        newTravelingUpkeep = int256(cap);
                    }
                    planetUpdate.travelingUpkeep = int40(newTravelingUpkeep);
                    planetUpdate.futureExtraProduction = uint24(
                        futureExtraProduction
                    ); // cap is always smaller than uint24
                }
            }

            if (planetUpdate.overflow > quantity) {
                planetUpdate.overflow -= quantity;
            } else {
                planetUpdate.overflow = 0;
            }
        }
    }

    function _setFleetFlyingSlot(uint256 from, uint32 quantity) internal {
        // -----------------------------------------------------------------------------------------------------------
        // record flying fleets (to prevent front-running, see resolution)
        // -----------------------------------------------------------------------------------------------------------
        uint256 timeSlot = block.timestamp / (_frontrunningDelay / 2);
        uint32 flying = _inFlight[from][timeSlot].flying;
        unchecked {
            flying = flying + quantity;
        }
        require(flying >= quantity, "ORBIT_OVERFLOW"); // unlikely to ever happen,
        // would need a huge amount of spaceships to be received and each in turn being sent
        // TOEXPLORE could also cap, that would result in some fleet being able to escape.
        _inFlight[from][timeSlot].flying = flying;
        // -----------------------------------------------------------------------------------------------------------
    }

    // ---------------------------------------------------------------------------------------------------------------
    // FLEET RESOLUTION, ATTACK / REINFORCEMENT
    // ---------------------------------------------------------------------------------------------------------------
    struct ResolutionState {
        address fleetOwner;
        uint40 fleetLaunchTime;
        uint32 originalQuantity;
        uint32 fleetQuantity;
        bytes32 fromData;
        uint32 inFlightFleetLoss;
        uint32 inFlightPlanetLoss;
        bool gifting;
        bool taxed;
        bool victory;
        uint32 attackerLoss;
        uint32 defenderLoss;
        uint32 orbitDefense1;
        uint32 orbitDefenseDestroyed1;
        uint32 orbitDefense2;
        uint32 orbitDefenseDestroyed2;
        uint40 arrivalTime;
        uint32 accumulatedDefenseAdded;
        uint32 accumulatedAttackAdded;
        uint16 attackPower;
        uint24 futureExtraProduction;
    }

    function _resolveFleet(
        uint256 fleetId,
        FleetResolution calldata resolution
    ) internal {
        // -----------------------------------------------------------------------------------------------------------
        // Initialise State Update
        // -----------------------------------------------------------------------------------------------------------
        Planet storage toPlanet = _getPlanet(resolution.to);
        PlanetUpdateState memory toPlanetUpdate = _createPlanetUpdateState(
            toPlanet,
            resolution.to
        );
        ResolutionState memory rState = _createResolutionState(
            _fleets[fleetId],
            resolution.from
        );

        // -----------------------------------------------------------------------------------------------------------
        // check requirements
        // -----------------------------------------------------------------------------------------------------------

        require(
            rState.fleetQuantity > 0,
            rState.fleetOwner != address(0)
                ? "FLEET_RESOLVED_ALREADY"
                : "FLEET_DO_NOT_EXIST"
        );
        _requireCorrectDistance(
            resolution.distance,
            resolution.from,
            resolution.to,
            rState.fromData,
            toPlanetUpdate.data
        );
        _requireCorrectTimeAndUpdateArrivalTime(
            resolution.distance,
            resolution.arrivalTimeWanted,
            rState.fleetLaunchTime,
            rState.fromData,
            rState
        );

        if (_bootstrapSessionEndTime > 0) {
            uint256 timestamp = block.timestamp;

            if (timestamp >= _bootstrapSessionEndTime) {
                require(
                    rState.fleetLaunchTime >= _infinityStartTime,
                    "FLEET_LAUNCHED_IN_BOOTSTRAP"
                );
            }
        }

        // -----------------------------------------------------------------------------------------------------------
        // Compute Basic Planet Updates
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForTimeElapsed(toPlanetUpdate);

        address ownerAtArrival = toPlanetUpdate.newOwner; // this can be owner == address(0)

        uint32 numSpaceshipsAtArrival = toPlanetUpdate.numSpaceships;

        // -----------------------------------------------------------------------------------------------------------
        // Traveling logic...
        // -----------------------------------------------------------------------------------------------------------

        _computeInFlightLossForFleet(rState, resolution);

        // -----------------------------------------------------------------------------------------------------------
        // Resolution logic...
        // -----------------------------------------------------------------------------------------------------------

        _updateFleetForGifting(rState, resolution, toPlanetUpdate.newOwner);

        _computeResolutionResult(rState, toPlanetUpdate);

        // -----------------------------------------------------------------------------------------------------------
        // Write New State
        // -----------------------------------------------------------------------------------------------------------

        _recordInOrbitLossAfterAttack(rState, toPlanetUpdate);

        _recordOrbitLossAccountingForFleetOrigin(rState, resolution);

        _setTravelingUpkeepFromOrigin(fleetId, rState, resolution.from);

        _setPlanet(toPlanet, toPlanetUpdate, rState.victory);

        _setAccumulatedAttack(rState, toPlanetUpdate);

        _fleets[fleetId].quantity = (1 << 31) | _fleets[fleetId].quantity;
        _fleets[fleetId].defender = ownerAtArrival;
        _fleets[fleetId].defenderLoss = rState.defenderLoss;
        _fleets[fleetId].arrivalTime = uint40(block.timestamp);
        _fleets[fleetId].planetActive = toPlanetUpdate.active;
        _fleets[fleetId].victory = rState.victory;

        // -----------------------------------------------------------------------------------------------------------
        // Events
        // -----------------------------------------------------------------------------------------------------------
        _emitFleetArrived(
            fleetId,
            rState,
            ownerAtArrival,
            resolution,
            _arrivalData(rState, toPlanetUpdate, numSpaceshipsAtArrival)
        );

        if (toPlanetUpdate.active && rState.victory) {
            // if active and the fleet was victorious we need to handle stake change of hands
            if (toPlanetUpdate.exitStartTime != 0) {
                // exit has been interupted
                // we add stake to new owner
                _notifyGeneratorAdd(
                    toPlanetUpdate.newOwner,
                    uint256(_stake(toPlanetUpdate.data)) * (DECIMALS_14)
                );
            } else {
                // there was no exit, so we move the stake
                _notifyGeneratorMove(
                    toPlanetUpdate.owner,
                    toPlanetUpdate.newOwner,
                    uint256(_stake(toPlanetUpdate.data)) * (DECIMALS_14)
                );
            }
        }
    }

    function _arrivalData(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate,
        uint32 numSpaceshipsAtArrival
    ) internal pure returns (ArrivalData memory arrivalData) {
        arrivalData.newNumspaceships = toPlanetUpdate.numSpaceships;
        arrivalData.newTravelingUpkeep = toPlanetUpdate.travelingUpkeep;
        arrivalData.newOverflow = toPlanetUpdate.overflow;
        arrivalData.numSpaceshipsAtArrival = numSpaceshipsAtArrival;
        arrivalData.taxLoss = rState.taxed
            ? (rState.originalQuantity - rState.inFlightFleetLoss) -
                rState.fleetQuantity
            : 0;
        arrivalData.fleetLoss = rState.attackerLoss;
        arrivalData.planetLoss = rState.defenderLoss;
        arrivalData.inFlightFleetLoss = rState.inFlightFleetLoss;
        arrivalData.inFlightPlanetLoss = rState.inFlightPlanetLoss;
        arrivalData.accumulatedDefenseAdded = rState.accumulatedDefenseAdded;
        arrivalData.accumulatedAttackAdded = rState.accumulatedAttackAdded;
    }

    function _emitFleetArrived(
        uint256 fleetId,
        ResolutionState memory rState,
        address planetOwner,
        FleetResolution memory resolution,
        ArrivalData memory arrivalData
    ) internal {
        emit BlockTime(block.number, block.timestamp);
        emit FleetRevealed(
            fleetId,
            resolution.from,
            resolution.to,
            resolution.arrivalTimeWanted,
            resolution.gift,
            resolution.specific,
            resolution.secret,
            resolution.fleetSender,
            resolution.operator
        );
        emit FleetArrived(
            fleetId,
            rState.fleetOwner,
            planetOwner,
            resolution.to,
            rState.gifting,
            rState.victory,
            arrivalData
        );
    }

    function _requireCorrectDistance(
        uint256 distance,
        uint256 from,
        uint256 to,
        bytes32 fromPlanetData,
        bytes32 toPlanetData
    ) internal pure {
        // check input instead of compute sqrt

        (int8 fromSubX, int8 fromSubY) = _subLocation(fromPlanetData);
        (int8 toSubX, int8 toSubY) = _subLocation(toPlanetData);
        uint256 distanceSquared = uint256(
            int256(
                // check input instead of compute sqrt
                ((int128(int256(to & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) * 4 +
                    toSubX) -
                    (int128(int256(from & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) *
                        4 +
                        fromSubX)) **
                    2 +
                    ((int128(int256(to >> 128)) * 4 + toSubY) -
                        (int128(int256(from >> 128)) * 4 + fromSubY)) **
                        2
            )
        );
        require(
            distance ** 2 <= distanceSquared &&
                distanceSquared < (distance + 1) ** 2,
            "wrong distance"
        );
    }

    function _requireCorrectTimeAndUpdateArrivalTime(
        uint256 distance,
        uint256 arrivalTimeWanted,
        uint40 launchTime,
        bytes32 fromPlanetData,
        ResolutionState memory rState
    ) internal view {
        uint256 minReachTime = launchTime +
            (distance * (_timePerDistance * 10000)) / _speed(fromPlanetData);
        uint256 reachTime = Math.max(arrivalTimeWanted, minReachTime);
        if (arrivalTimeWanted > 0) {
            rState.arrivalTime = uint40(arrivalTimeWanted);
        } else {
            rState.arrivalTime = uint40(minReachTime);
        }
        require(block.timestamp >= reachTime, "too early");
        require(
            block.timestamp < reachTime + _resolveWindow,
            "too late, your spaceships are lost in space"
        );
    }

    function _computeInFlightLossForFleet(
        ResolutionState memory rState,
        FleetResolution memory resolution
    ) internal view {
        // -----------------------------------------------------------------------------------------------------------
        // check if fleet was attacked while departing (used to prevent front-running, see fleet sending)
        // -----------------------------------------------------------------------------------------------------------
        uint256 timeSlot = rState.fleetLaunchTime / (_frontrunningDelay / 2);
        uint32 destroyed = _inFlight[resolution.from][timeSlot].destroyed;
        uint32 originalQuantity = rState.fleetQuantity;
        if (destroyed < rState.fleetQuantity) {
            rState.fleetQuantity -= uint32(destroyed);
        } else {
            rState.fleetQuantity = 0;
        }

        rState.inFlightFleetLoss = originalQuantity - rState.fleetQuantity;
        // -----------------------------------------------------------------------------------------------------------
    }

    function _updateFleetForGifting(
        ResolutionState memory rState,
        FleetResolution memory resolution,
        address destinationOwner
    ) internal view {
        (bool gifting, bool taxed) = _computeGifting(
            destinationOwner,
            resolution,
            rState
        );
        rState.gifting = gifting;
        rState.taxed = taxed;
    }

    // TODO simplify and apply that to attack (when fleetOwner is not fleetSender)
    //  if (resolution.gift) { rState.fleetOwner = destinationOwner }
    //  then compute tax based on fleetOwner != fleetSender, box for attacks and gift
    //  combined attack could even work for non-allies ?
    //  in _computeGift calculate the tax for every branch that result in `gifting` being false
    //  then in attack, add tax to the quantity of fleet + modify event

    // solhint-disable-next-line code-complexity
    function _computeGifting(
        address destinationOwner,
        FleetResolution memory resolution,
        ResolutionState memory rState
    ) internal view returns (bool gifting, bool taxed) {
        if (destinationOwner == address(0)) {
            // destination has no owner : this is an attack
            return (
                false,
                _isFleetOwnerTaxed(
                    rState.fleetOwner,
                    resolution.fleetSender,
                    rState.fleetLaunchTime
                )
            );
        }
        if (
            destinationOwner == rState.fleetOwner &&
            destinationOwner == resolution.fleetSender
        ) {
            // destination is sender is fleet owner: this is a non-taxed gift
            return (true, false);
        }

        if (resolution.gift || destinationOwner == rState.fleetOwner) {
            // intent was gift
            if (
                resolution.specific == address(0) || // anyone
                resolution.specific == destinationOwner || // only one address and matching owner
                destinationOwner == rState.fleetOwner // owner is fleet owner => gift
            ) {
                // and it was for anyone or specific destination owner that is the same as the current one
                // or it was simply that fleetOwner = destinationOwner

                // check tax applies with sender
                (, uint96 joinTime) = _allianceRegistry
                    .havePlayersAnAllianceInCommon(
                        resolution.fleetSender,
                        destinationOwner,
                        rState.fleetLaunchTime
                    );
                return (
                    true,
                    joinTime == 0 || joinTime > rState.fleetLaunchTime
                );
            }

            if (resolution.specific == address(1)) {
                // or the specific specify any common alliances (1)

                if (rState.fleetOwner == resolution.fleetSender) {
                    (, uint96 joinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            resolution.fleetSender,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );
                    return (joinTime > 0, joinTime > rState.fleetLaunchTime);
                } else {
                    (, uint96 fleetOwnerJoinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            rState.fleetOwner,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );

                    if (fleetOwnerJoinTime == 0) {
                        // not in an alliance
                        return (
                            false,
                            _isFleetOwnerTaxed(
                                rState.fleetOwner,
                                resolution.fleetSender,
                                rState.fleetLaunchTime
                            )
                        );
                    }

                    // alliance => means gift
                    // check if taxed:
                    (, uint96 senderJoinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            resolution.fleetSender,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );

                    return (
                        true,
                        senderJoinTime == 0 ||
                            senderJoinTime > rState.fleetLaunchTime
                    );
                }
            }

            if (uint160(resolution.specific) > 1) {
                // or a specific alliance that matches

                (uint96 joinTimeToSpecific, ) = _allianceRegistry
                    .getAllianceData(
                        destinationOwner,
                        IAlliance(resolution.specific)
                    );

                if (joinTimeToSpecific > 0) {
                    (, uint96 joinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            resolution.fleetSender,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );
                    return (
                        true,
                        joinTime == 0 || joinTime > rState.fleetLaunchTime
                    );
                }
            }
        } else {
            // intent was attack
            if (resolution.specific == address(1)) {
                // and the attack was on any non-allies

                if (rState.fleetOwner == resolution.fleetSender) {
                    // make it a gift if the destination owner is actually an ally
                    (, uint96 joinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            resolution.fleetSender,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );
                    return (joinTime > 0, joinTime > rState.fleetLaunchTime);
                } else {
                    (, uint96 fleetOwnerJoinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            rState.fleetOwner,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );

                    if (fleetOwnerJoinTime == 0) {
                        // not in an alliance
                        return (
                            false,
                            _isFleetOwnerTaxed(
                                rState.fleetOwner,
                                resolution.fleetSender,
                                rState.fleetLaunchTime
                            )
                        );
                    }

                    // alliance => means gift
                    // check if taxed:
                    (, uint96 senderJoinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            resolution.fleetSender,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );

                    return (
                        true,
                        senderJoinTime == 0 ||
                            senderJoinTime > rState.fleetLaunchTime
                    );
                }
            }

            if (
                uint160(resolution.specific) > 1 &&
                resolution.specific != destinationOwner
            ) {
                // but specific not matching current owner

                (uint96 joinTimeToSpecific, ) = _allianceRegistry
                    .getAllianceData(
                        destinationOwner,
                        IAlliance(resolution.specific)
                    );

                // make it a gift if the destination is not matching the specific alliance
                // (or owner, in which case since it is not an alliance, it will also not match)
                if (joinTimeToSpecific == 0) {
                    (, uint96 joinTime) = _allianceRegistry
                        .havePlayersAnAllianceInCommon(
                            resolution.fleetSender,
                            destinationOwner,
                            rState.fleetLaunchTime
                        );
                    return (
                        true,
                        joinTime == 0 || joinTime > rState.fleetLaunchTime
                    );
                }
            }
        }
        return (
            false,
            _isFleetOwnerTaxed(
                rState.fleetOwner,
                resolution.fleetSender,
                rState.fleetLaunchTime
            )
        );
    }

    function _isFleetOwnerTaxed(
        address fleetOwner,
        address fleetSender,
        uint40 fleetLaunchTime
    ) internal view returns (bool) {
        if (fleetOwner == fleetSender) {
            return false;
        }
        (, uint96 joinTime) = _allianceRegistry.havePlayersAnAllianceInCommon(
            fleetOwner,
            fleetSender,
            fleetLaunchTime
        );
        return joinTime == 0 || joinTime > fleetLaunchTime;
    }

    function _setTravelingUpkeepFromOrigin(
        uint256 fleetID,
        ResolutionState memory rState,
        uint256 location
    ) internal {
        // // we have to update the origin
        Planet storage fromPlanet = _planets[location];
        PlanetUpdateState memory fromPlanetUpdate = _createPlanetUpdateState(
            fromPlanet,
            location
        );
        _computePlanetUpdateForTimeElapsed(fromPlanetUpdate);

        uint16 production = _production(fromPlanetUpdate.data);
        uint256 capWhenActive = _capWhenActive(production);

        uint256 refund = rState.futureExtraProduction;
        uint256 timePassed = block.timestamp - rState.fleetLaunchTime;
        uint256 amountProducedTheWholeTime = (timePassed *
            uint256(_productionSpeedUp) *
            uint256(production)) / 1 hours;
        uint256 consumed = amountProducedTheWholeTime +
            (amountProducedTheWholeTime *
                _upkeepProductionDecreaseRatePer10000th) /
                10000;
        if (consumed > refund) {
            refund = 0;
        } else {
            refund -= consumed;
        }

        int256 newTravelingUpkeep = int256(fromPlanetUpdate.travelingUpkeep) -
            int256(refund);
        if (newTravelingUpkeep < -int256(capWhenActive)) {
            newTravelingUpkeep = -int256(capWhenActive);
        }
        fromPlanetUpdate.travelingUpkeep = int40(newTravelingUpkeep);

        _setPlanet(fromPlanet, fromPlanetUpdate, false);

        emit BlockTime(block.number, block.timestamp);
        emit TravelingUpkeepRefund(
            location,
            fleetID,
            fromPlanetUpdate.numSpaceships,
            fromPlanetUpdate.travelingUpkeep,
            fromPlanetUpdate.overflow
        );
    }

    function _setAccumulatedAttack(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal {
        if (!rState.taxed) {
            AccumulatedAttack storage attack = _attacks[
                toPlanetUpdate.location
            ][rState.fleetOwner][rState.arrivalTime];

            // NOTE: target is required for the case where a different player capture the planet in-between
            //  otherwise, that player would be hitted with higher attack than would be fair
            //  hmm would it acutally ? the accumulatedDefenseAdded would still be counted
            //  Indeed, the only real player affected by _attacks[location][fleetOwner][arrivalTime] is the fleetOwner
            //  regardless of who is owner of the planet
            // attack.target = toPlanetUpdate.owner;
            // we leave this as is as we do not want to change the struct
            attack.damageCausedSoFar =
                rState.defenderLoss +
                rState.inFlightPlanetLoss +
                rState.accumulatedDefenseAdded;
            attack.numAttackSpent =
                rState.attackerLoss +
                rState.accumulatedAttackAdded +
                // when victorius we consider the full number of spaceship as used
                // this way if a combined attack arrive later, it can still count the whole attack and get a refund
                (rState.victory ? toPlanetUpdate.numSpaceships : 0);
            attack.averageAttackPower = rState.attackPower;
        }
    }

    function _combinedRefund(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view returns (uint256 accumulationRefund) {
        _updateAccumulation(rState, toPlanetUpdate);
        if (rState.accumulatedAttackAdded > 0) {
            uint16 attack = rState.attackPower;
            uint16 defense = _defense(toPlanetUpdate.data);
            uint256 numAttack = rState.fleetQuantity +
                rState.accumulatedAttackAdded;
            (uint32 attackerLoss, ) = _computeFight(
                numAttack,
                rState.accumulatedDefenseAdded,
                attack,
                defense
            );
            if (rState.accumulatedAttackAdded > attackerLoss) {
                accumulationRefund =
                    rState.accumulatedAttackAdded - attackerLoss;
                if (accumulationRefund > rState.accumulatedAttackAdded) {
                    rState.accumulatedAttackAdded = 0;
                } else {
                    rState.accumulatedAttackAdded = uint32(
                        uint256(rState.accumulatedAttackAdded) -
                            accumulationRefund
                    );
                }
            }
        }
    }

    function _createResolutionState(
        Fleet storage fleet,
        uint256 from
    ) internal view returns (ResolutionState memory rState) {
        uint32 q = fleet.quantity >> 31 == 1 ? 0 : fleet.quantity;
        rState.fleetOwner = fleet.owner;
        rState.fleetLaunchTime = fleet.launchTime;
        rState.originalQuantity = q;
        rState.fleetQuantity = q;
        rState.futureExtraProduction = fleet.futureExtraProduction;
        rState.fromData = _planetData(from);
        rState.attackPower = _attack(rState.fromData);
    }

    function _recordOrbitLossAccountingForFleetOrigin(
        ResolutionState memory rState,
        FleetResolution memory resolution
    ) internal {
        if (rState.inFlightFleetLoss > 0) {
            uint256 timeSlot = rState.fleetLaunchTime /
                (_frontrunningDelay / 2);

            // NOTE we already computed that destroyed cannot be smaller than inFlightFleetLoss
            //  see _computeInFlightLossForFleet
            _inFlight[resolution.from][timeSlot].destroyed -= rState
                .inFlightFleetLoss;
        }
    }

    function _computeResolutionResult(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        if (rState.taxed) {
            rState.fleetQuantity = uint32(
                uint256(rState.fleetQuantity) -
                    (uint256(rState.fleetQuantity) * _giftTaxPer10000) / 10000
            );
        }
        if (rState.gifting) {
            _computeGiftingResolutionResult(rState, toPlanetUpdate);
        } else {
            _computeAttackResolutionResult(rState, toPlanetUpdate);
        }
    }

    function _computeGiftingResolutionResult(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        uint256 newNumSpaceships = toPlanetUpdate.numSpaceships +
            rState.fleetQuantity +
            _combinedRefund(rState, toPlanetUpdate);
        if (newNumSpaceships >= ACTIVE_MASK) {
            newNumSpaceships = ACTIVE_MASK - 1;
        }

        toPlanetUpdate.numSpaceships = uint32(newNumSpaceships);
        if (!toPlanetUpdate.active) {
            // NOTE: not active, overflow is applied on cap = 0
            if (toPlanetUpdate.numSpaceships > toPlanetUpdate.overflow) {
                toPlanetUpdate.overflow = toPlanetUpdate.numSpaceships;
            }
        } else {
            uint32 cap = uint32(
                _capWhenActive(_production(toPlanetUpdate.data))
            );
            if (_productionCapAsDuration > 0 && newNumSpaceships > cap) {
                if (
                    toPlanetUpdate.numSpaceships - cap > toPlanetUpdate.overflow
                ) {
                    toPlanetUpdate.overflow = uint32(
                        toPlanetUpdate.numSpaceships - cap
                    );
                }
            } else {
                toPlanetUpdate.overflow = 0;
            }
        }
    }

    function _updateAccumulation(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        // TODO 45min config ?
        if (
            !rState.taxed && block.timestamp < rState.arrivalTime + 45 minutes
        ) {
            AccumulatedAttack memory acc = _attacks[toPlanetUpdate.location][
                rState.fleetOwner
            ][rState.arrivalTime];

            // TODO  acc.target == toPlanetUpdate.owner || toPlanetUpdate.owner == fleetOwner  so your combined attack works when you get it
            // what about your allies ?
            // taxed work as he accumulated attack is already shared with allies (s)
            // so we should not need to modify here ?
            // if (acc.target == toPlanetUpdate.owner && acc.numAttackSpent != 0) {
            if (acc.numAttackSpent != 0) {
                rState.attackPower = uint16(
                    (uint256(rState.attackPower) *
                        uint256(rState.fleetQuantity) +
                        uint256(acc.averageAttackPower) *
                            uint256(acc.numAttackSpent)) /
                        (uint256(rState.fleetQuantity) +
                            uint256(acc.numAttackSpent))
                );
                rState.accumulatedAttackAdded = acc.numAttackSpent;
                rState.accumulatedDefenseAdded = acc.damageCausedSoFar;
            }
        }
    }

    function _computeAttackResolutionResult(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        // NOTE natives come back to power once numSPaceships == 0 and planet not active
        if (
            !toPlanetUpdate.active &&
            toPlanetUpdate.numSpaceships < _natives(toPlanetUpdate.data)
        ) {
            _updatePlanetUpdateStateAndResolutionStateForNativeAttack(
                rState,
                toPlanetUpdate
            );
        } else {
            _updateAccumulation(rState, toPlanetUpdate);

            _updatePlanetUpdateStateAndResolutionStateForPlanetAttack(
                rState,
                toPlanetUpdate
            );
        }
    }

    function _updatePlanetUpdateStateAndResolutionStateForNativeAttack(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        // NOTE: when we are dealing with native attacks, we do not consider combined attacks
        // TODO We need to consider that case in the UI
        uint16 attack = _attack(rState.fromData);
        uint16 defense = _defense(toPlanetUpdate.data);
        uint16 natives = _natives(toPlanetUpdate.data);
        (uint32 attackerLoss, uint32 defenderLoss) = _computeFight(
            rState.fleetQuantity,
            natives,
            attack,
            defense
        );
        rState.attackerLoss = attackerLoss;
        if (defenderLoss == natives && rState.fleetQuantity > attackerLoss) {
            // (attackerLoss: 0, defenderLoss: 0) means that numAttack was zero as natives cannot be zero
            toPlanetUpdate.numSpaceships = rState.fleetQuantity - attackerLoss;
            rState.defenderLoss = defenderLoss;
            rState.victory = true;
            toPlanetUpdate.newOwner = rState.fleetOwner;
            // solhint-disable-next-line no-empty-blocks
        }
        // NOTE else (attacker lost) then nothing happen
    }

    function _updatePlanetUpdateStateAndResolutionStateForPlanetAttack(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        _updateResolutionStateFromOrbitDefense(rState, toPlanetUpdate);
        uint256 numDefense = toPlanetUpdate.numSpaceships +
            rState.accumulatedDefenseAdded +
            rState.orbitDefense1 +
            rState.orbitDefense2;
        uint16 production = _production(toPlanetUpdate.data);

        if (numDefense == 0 && rState.fleetQuantity > 0) {
            // scenario where there is actually no defense on the place,

            toPlanetUpdate.newOwner = rState.fleetOwner;
            toPlanetUpdate.numSpaceships = rState.fleetQuantity;
            if (!toPlanetUpdate.active) {
                // numDefense = 0 so numAttack is the overflow, attacker took over
                toPlanetUpdate.overflow = toPlanetUpdate.numSpaceships;
            } else {
                if (_productionCapAsDuration > 0) {
                    uint32 cap = uint32(_capWhenActive(production));
                    if (toPlanetUpdate.numSpaceships > cap) {
                        // numDefense = 0 so numAttack is the overflow, attacker took over
                        toPlanetUpdate.overflow = uint32(
                            toPlanetUpdate.numSpaceships - cap
                        );
                    } else {
                        toPlanetUpdate.overflow = 0;
                    }
                }
            }

            rState.victory = true;
        } else {
            _computeAttack(rState, toPlanetUpdate, numDefense);
            _computeTravelingUpkeepReductionFromDefenseLoss(
                rState,
                toPlanetUpdate,
                production
            );
        }
    }

    function _updateResolutionStateFromOrbitDefense(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal view {
        // -----------------------------------------------------------------------------------------------------------
        // consider fleets that just departed from the planet (used to prevent front-running, see fleet sending)
        // -----------------------------------------------------------------------------------------------------------
        uint256 timeSlot = block.timestamp / (_frontrunningDelay / 2);
        InFlight storage slot1 = _inFlight[toPlanetUpdate.location][
            timeSlot - 1
        ];
        rState.orbitDefense1 = slot1.flying > 2 ** 31
            ? 2 ** 31 - 1
            : uint32(slot1.flying);
        rState.orbitDefenseDestroyed1 = slot1.destroyed > 2 ** 31
            ? 2 ** 31 - 1
            : uint32(slot1.destroyed);
        InFlight storage slot2 = _inFlight[toPlanetUpdate.location][timeSlot];
        rState.orbitDefense2 = slot2.flying > 2 ** 31
            ? 2 ** 31 - 1
            : uint32(slot2.flying);
        rState.orbitDefenseDestroyed2 = slot2.destroyed > 2 ** 31
            ? 2 ** 31 - 1
            : uint32(slot2.destroyed);
    }

    // solhint-disable-next-line code-complexity
    function _computeAttack(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate,
        uint256 numDefense
    ) internal view {
        uint16 attack = rState.attackPower;
        uint16 defense = _defense(toPlanetUpdate.data);
        uint256 numAttack = rState.fleetQuantity +
            rState.accumulatedAttackAdded;
        (uint32 attackerLoss, uint32 defenderLoss) = _computeFight(
            numAttack,
            numDefense,
            attack,
            defense
        );
        rState.defenderLoss = defenderLoss;
        rState.attackerLoss = rState.accumulatedAttackAdded > attackerLoss
            ? 0
            : attackerLoss - rState.accumulatedAttackAdded;

        // (attackerLoss: 0, defenderLoss: 0) could either mean attack was zero or defense was zero :
        if (rState.fleetQuantity > 0 && rState.defenderLoss == numDefense) {
            // NOTE Attacker wins

            // all orbiting fleets are destroyed, inFlightPlanetLoss is all that is left
            uint256 inFlightPlanetLoss = numDefense -
                toPlanetUpdate.numSpaceships -
                rState.accumulatedDefenseAdded;
            if (inFlightPlanetLoss > ACTIVE_MASK) {
                // cap it
                // TODO investigate potential issues
                inFlightPlanetLoss = ACTIVE_MASK - 1;
            }
            rState.inFlightPlanetLoss = uint32(inFlightPlanetLoss);

            rState.defenderLoss =
                rState.defenderLoss - rState.inFlightPlanetLoss;

            toPlanetUpdate.numSpaceships =
                rState.fleetQuantity - rState.attackerLoss;
            rState.victory = true;

            toPlanetUpdate.newOwner = rState.fleetOwner;

            if (!toPlanetUpdate.active) {
                // attack took over, overflow is numSpaceships
                toPlanetUpdate.overflow = toPlanetUpdate.numSpaceships;
            } else {
                if (_productionCapAsDuration > 0) {
                    uint16 production = _production(toPlanetUpdate.data);
                    uint32 cap = uint32(_capWhenActive(production));
                    if (toPlanetUpdate.numSpaceships > cap) {
                        if (
                            toPlanetUpdate.numSpaceships - cap >
                            toPlanetUpdate.overflow
                        ) {
                            toPlanetUpdate.overflow =
                                toPlanetUpdate.numSpaceships - cap;
                        }
                    } else {
                        toPlanetUpdate.overflow = 0;
                    }
                }
            }
        } else if (rState.attackerLoss == rState.fleetQuantity) {
            // NOTE Defender wins

            if (
                defenderLoss >
                toPlanetUpdate.numSpaceships + rState.accumulatedDefenseAdded
            ) {
                rState.inFlightPlanetLoss =
                    defenderLoss -
                    toPlanetUpdate.numSpaceships -
                    rState.accumulatedDefenseAdded;

                toPlanetUpdate.numSpaceships = 0;
                // TODO change owner already if incative ?
                //  not needed though as this is the same has having numSpaceships = 1 and become zero over time

                if (rState.orbitDefense1 >= rState.inFlightPlanetLoss) {
                    rState.orbitDefense1 -= rState.inFlightPlanetLoss;
                    rState.orbitDefenseDestroyed1 += rState.inFlightPlanetLoss;
                } else {
                    rState.orbitDefenseDestroyed1 += rState.orbitDefense1;
                    uint32 extra = (rState.inFlightPlanetLoss -
                        rState.orbitDefense1);
                    if (rState.orbitDefense2 >= extra) {
                        rState.orbitDefense2 -= extra;
                        rState.orbitDefenseDestroyed2 += extra;
                    } else {
                        rState.orbitDefenseDestroyed2 += rState.orbitDefense2;
                        rState.orbitDefense2 = 0; // should never reach minus but let simply set it to zero
                    }
                    rState.orbitDefense1 = 0;
                }
            } else {
                toPlanetUpdate.numSpaceships =
                    toPlanetUpdate.numSpaceships +
                    rState.accumulatedDefenseAdded -
                    defenderLoss;

                // TODO change owner already if incative and numSpaceship == 0 (like above)
                //  not needed though as this is the same has having numSpaceships = 1 and become zero over time
            }

            // same as numSpaceshipAtArrival - toPlanetUpdate.numSpaceship;
            rState.defenderLoss =
                rState.defenderLoss -
                rState.inFlightPlanetLoss -
                rState.accumulatedDefenseAdded;

            if (!toPlanetUpdate.active) {
                if (defenderLoss > toPlanetUpdate.overflow) {
                    toPlanetUpdate.overflow = 0;
                } else {
                    toPlanetUpdate.overflow -= defenderLoss;
                }
            } else {
                if (_productionCapAsDuration > 0) {
                    uint16 production = _production(toPlanetUpdate.data);
                    uint32 cap = uint32(_capWhenActive(production));
                    if (toPlanetUpdate.numSpaceships > cap) {
                        if (defenderLoss <= toPlanetUpdate.overflow) {
                            toPlanetUpdate.overflow -= defenderLoss;
                        } else {
                            toPlanetUpdate.overflow = 0;
                        }
                    } else {
                        toPlanetUpdate.overflow = 0;
                    }
                }
            }
        } else {
            // should not happen
            // because we check for numDefense == 0 before performing the attack, see _updatePlanetUpdateStateAndResolutionStateForPlanetAttack
            revert("ZERO_ZERO");
        }
    }

    function _computeFight(
        uint256 numAttack,
        uint256 numDefense,
        uint256 attack,
        uint256 defense
    ) internal view returns (uint32 attackerLoss, uint32 defenderLoss) {
        if (numAttack == 0 || numDefense == 0) {
            // this edge case need to be considered,
            // as the result of this function cannot tell from it whos is winning here
            return (0, 0);
        }

        uint256 attackFactor = numAttack *
            ((1000000 - _fleetSizeFactor6) +
                ((_fleetSizeFactor6 * numAttack) / numDefense));
        uint256 attackDamage = (attackFactor * attack) / defense / 1000000;

        if (numDefense > attackDamage) {
            // attack fails
            attackerLoss = uint32(numAttack); // all attack destroyed
            defenderLoss = uint32(attackDamage); // 1 spaceship will be left at least as attackDamage < numDefense
        } else {
            // attack succeed
            uint256 defenseFactor = numDefense *
                ((1000000 - _fleetSizeFactor6) +
                    ((_fleetSizeFactor6 * numDefense) / numAttack));
            uint256 defenseDamage = uint32(
                (defenseFactor * defense) / attack / 1000000
            );

            if (defenseDamage >= numAttack) {
                defenseDamage = numAttack - 1; // ensure 1 spaceship left
            }

            attackerLoss = uint32(defenseDamage);
            defenderLoss = uint32(numDefense); // all defense destroyed
        }
    }

    function _computeTravelingUpkeepReductionFromDefenseLoss(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate,
        uint16 production
    ) internal view {
        // allow the attacker to pay for upkeep as part of the attack
        // only get to keep the upkeep that was there as a result of spaceships sent away

        uint256 capWhenActive = _capWhenActive(production);

        int256 totalDefenseLoss = int256(
            uint256(rState.defenderLoss) + uint256(rState.inFlightPlanetLoss)
        );
        int256 newTravelingUpkeep = int256(toPlanetUpdate.travelingUpkeep) -
            totalDefenseLoss;
        if (newTravelingUpkeep < -int256(capWhenActive)) {
            newTravelingUpkeep = -int256(capWhenActive);
        }
        toPlanetUpdate.travelingUpkeep = int40(newTravelingUpkeep);
    }

    function _recordInOrbitLossAfterAttack(
        ResolutionState memory rState,
        PlanetUpdateState memory toPlanetUpdate
    ) internal {
        if (rState.inFlightPlanetLoss > 0) {
            InFlight storage slot1 = _inFlight[toPlanetUpdate.location][
                block.timestamp / (_frontrunningDelay / 2) - 1
            ];
            slot1.flying = rState.orbitDefense1;
            slot1.destroyed = rState.orbitDefenseDestroyed1;

            InFlight storage slot2 = _inFlight[toPlanetUpdate.location][
                block.timestamp / (_frontrunningDelay / 2)
            ];
            slot2.flying = rState.orbitDefense2;
            slot2.destroyed = rState.orbitDefenseDestroyed2;
        }
    }

    function _callWithGas(address to, bytes memory data, uint256 gas) internal {
        // We want to ensure enough gas were given for the generator, but no more
        // This way if the generator is broken/compromised (we are planning to update it)
        // then this will always continue to work
        // Reversely, a player have to provide enough gas
        // and we want to ensure the player can't force a revert on the hook
        // In particular. to prevent players to make a call to `remove` fails

        if (to != address(0)) {
            // we could do the check prior:
            // uint256 gasAvailable = gasleft() - 2000;
            // require(gasAvailable - gasAvailable / 64  >= gas, "NOT_ENOUGH_GAS_FOR_INNER_CALL");
            // to.call{gas: gas}(data);
            // but we instead chose to do the check after.
            // for more info see: https://ronan.eth.limo/blog/ethereum-gas-dangers/

            to.call{gas: gas}(data);
            // we use after the gas check as this allow us to not require heavy gas use if not needed
            // instead of + 100,000 for 96,000 gas we can just add 1,524 gas (+ a bit more)
            require(gasleft() > gas / 63, "NOT_ENOUGH_GAS_FOR_INNER_CALL");
        }
    }

    function _generator() internal view returns (address generator) {
        assembly {
            // keccak256("generator") - 1
            generator := sload(
                0x27ec6af4a6510eb9b7e0cc7f39415b7f15e430e53eb0cd3997e7c7e0cf680f6e
            )
        }
    }

    function _notifyGeneratorAdd(address player, uint256 amount) internal {
        _callWithGas(
            _generator(),
            abi.encodeWithSelector(IOnStakeChange.add.selector, player, amount),
            96000
        );
    }

    function _notifyGeneratorRemove(address player, uint256 amount) internal {
        _callWithGas(
            _generator(),
            abi.encodeWithSelector(
                IOnStakeChange.remove.selector,
                player,
                amount
            ),
            96000
        );
    }

    function _notifyGeneratorMove(
        address from,
        address to,
        uint256 amount
    ) internal {
        _callWithGas(
            _generator(),
            abi.encodeWithSelector(
                IOnStakeChange.move.selector,
                from,
                to,
                amount
            ),
            192000
        );
    }

    // ---------------------------------------------------------------------------------------------------------------
    // PLANET STATS
    // ---------------------------------------------------------------------------------------------------------------

    function _planetData(uint256 location) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_genesis, location));
    }

    function _subLocation(
        bytes32 data
    ) internal pure returns (int8 subX, int8 subY) {
        subX = 1 - int8(data.value8Mod(0, 3));
        subY = 1 - int8(data.value8Mod(2, 3));
    }

    function _stake(bytes32 data) internal view returns (uint32) {
        require(_exists(data), "PLANET_NOT_EXISTS");
        // return data.normal16(4, 0x000400050005000A000A000F000F00140014001E001E00280028005000500064);
        uint8 productionIndex = data.normal8(12); // production affect the stake value

        // TODO remove or decide otherwise:
        // uint16 offset = data.normal16(4, 0x0000000100010002000200030003000400040005000500060006000700070008);
        // uint16 stakeIndex = productionIndex + offset;
        // if (stakeIndex < 4) {
        //     stakeIndex = 0;
        // } else if (stakeIndex > 19) {
        //     stakeIndex = 15;
        // } else {
        //     stakeIndex -= 4;
        // }
        uint16 stakeIndex = productionIndex;
        return
            uint32(
                uint256(
                    uint16(uint8(_stakeRange[stakeIndex * 2])) * 0x100 +
                        uint16(uint8(_stakeRange[stakeIndex * 2 + 1]))
                ) * _stakeMultiplier10000th
            );
    }

    function _production(bytes32 data) internal pure returns (uint16) {
        require(_exists(data), "PLANET_NOT_EXISTS");
        // TODO TRY : 1800,2100,2400,2700,3000,3300,3600, 3600, 3600, 3600,4000,4400,4800,5400,6200,7200 ?

        // 1800,2100,2400,2700,3000,3300,3600, 3600, 3600, 3600,4200,5400,6600,7800,9000,12000
        // 0x0708083409600a8c0bb80ce40e100e100e100e101068151819c81e7823282ee0
        return
            data.normal16(
                12,
                0x0708083409600a8c0bb80ce40e100e100e100e101068151819c81e7823282ee0
            ); // per hour
    }

    function _capWhenActive(uint16 production) internal view returns (uint256) {
        return
            _acquireNumSpaceships +
            (uint256(production) * _productionCapAsDuration) / 1 hours;
    }

    function _attack(bytes32 data) internal pure returns (uint16) {
        require(_exists(data), "PLANET_NOT_EXISTS");
        return 4000 + data.normal8(20) * 400; // 4,000 - 7,000 - 10,000
    }

    function _defense(bytes32 data) internal pure returns (uint16) {
        require(_exists(data), "PLANET_NOT_EXISTS");
        return 4000 + data.normal8(28) * 400; // 4,000 - 7,000 - 10,000
    }

    function _speed(bytes32 data) internal pure returns (uint16) {
        require(_exists(data), "PLANET_NOT_EXISTS");
        return 5005 + data.normal8(36) * 333; // 5,005 - 7,502.5 - 10,000
    }

    function _natives(bytes32 data) internal pure returns (uint16) {
        require(_exists(data), "PLANET_NOT_EXISTS");
        return 15000 + data.normal8(44) * 3000; // 15,000 - 37,500 - 60,000
    }

    function _exists(bytes32 data) internal pure returns (bool) {
        return data.value8Mod(52, 16) == 1; // 16 => 36 so : 1 planet per 6 (=24 min unit) square
        // also:
        // 20000 average starting numSpaceships (or max?)
        // speed of min unit = 30 min ( 1 hour per square)
        // production : 20000 per 6 hours
        // exit : 3 days ? => 72 distance
    }

    // ---------------------------------------------------------------------------------------------------------------
    // GETTERS
    // ---------------------------------------------------------------------------------------------------------------

    function _getPlanet(
        uint256 location
    ) internal view returns (Planet storage) {
        return _planets[location];
    }

    function _getPlanetStats(
        uint256 location
    ) internal view returns (PlanetStats memory) {
        bytes32 data = _planetData(location);
        require(_exists(data), "no planet in this location");

        (int8 subX, int8 subY) = _subLocation(data);
        return
            PlanetStats({
                subX: subX,
                subY: subY,
                stake: _stake(data),
                production: _production(data),
                attack: _attack(data),
                defense: _defense(data),
                speed: _speed(data),
                natives: _natives(data)
            });
    }

    // ---------------------------------------------------------------------------------------------------------------
    // UTILS
    // ---------------------------------------------------------------------------------------------------------------

    function _activeNumSpaceships(
        uint32 numSpaceshipsData
    ) internal pure returns (bool active, uint32 numSpaceships) {
        active = (numSpaceshipsData & ACTIVE_MASK) == ACTIVE_MASK;
        numSpaceships = numSpaceshipsData % (ACTIVE_MASK);
    }

    function _setActiveNumSpaceships(
        bool active,
        uint32 numSpaceships
    ) internal pure returns (uint32) {
        return uint32((active ? ACTIVE_MASK : 0) + numSpaceships);
    }

    function _msgSender() internal view returns (address) {
        return msg.sender; // TODO metatx
    }

    modifier whenNotPaused() {
        if (_bootstrapSessionEndTime > 0) {
            uint256 timestamp = block.timestamp;
            uint256 pauseStart = _bootstrapSessionEndTime;
            uint256 pauseEnd = _infinityStartTime;

            require(timestamp < pauseStart || timestamp >= pauseEnd, "PAUSED");
        }
        _;
    }
}
