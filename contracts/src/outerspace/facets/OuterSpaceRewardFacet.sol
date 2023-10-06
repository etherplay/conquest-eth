// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";

contract OuterSpaceRewardFacet is OuterSpaceFacetBase {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function getPrevRewardIds(address sponsor) external view returns (uint256) {
        return _prevRewardIds[sponsor];
    }

    function addReward(uint256 location) external {
        _addReward(location, msg.sender);
    }

    function getRewardId(uint256 location) external view returns (uint256) {
        return _rewards[location];
    }

    function hasRewardGoalBeenAchieved(address player, uint256 fullRewardId) external view returns (bool) {
        return _rewardsToWithdraw[player][fullRewardId];
    }
}
