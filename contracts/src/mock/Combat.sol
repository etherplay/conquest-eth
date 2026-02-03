// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../outerspace/facets/OuterSpaceFacetBase.sol";

contract Combat is OuterSpaceFacetBase {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function computeFight(
        uint256 numAttack,
        uint256 numDefense,
        uint256 attack,
        uint256 defense
    ) external view returns (uint32 attackerLoss, uint32 defenderLoss) {
        return _computeFight(numAttack, numDefense, attack, defense);
    }
}