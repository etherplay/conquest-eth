// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

interface IReward {
    function reward(address to, uint256 amount) external;
}
