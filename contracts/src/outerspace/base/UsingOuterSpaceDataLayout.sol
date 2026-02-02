// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";

contract UsingOuterSpaceDataLayout is ImportingOuterSpaceTypes {
    mapping(uint256 => Planet) internal _planets;
    mapping(uint256 => Fleet) internal _fleets;

    mapping(address => uint256) internal _stakeReadyToBeWithdrawn;

    mapping(address => mapping(address => bool)) internal _operators;

    // Note: make it namespaces per user, currently it is possible (though unlikely) for 2 users to share a slot if one attack another and quickly send away spaceships
    mapping(uint256 => mapping(uint256 => InFlight)) internal _inFlight;

    Discovered internal _discovered;
    // rewards
    mapping(address => uint256) internal _prevRewardIds;
    mapping(uint256 => uint256) internal _rewards;
    mapping(address => mapping(uint256 => bool)) internal _rewardsToWithdraw;

    // This adds 20,000 gas to all resolution
    mapping(uint256 => mapping(address => mapping(uint256 => AccumulatedAttack)))
        internal _attacks;

    mapping(address => uint256) internal _freeStakeReadyToBeWithdrawn;
    mapping(uint256 => uint256) internal _planetFlagged;
}
