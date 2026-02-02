// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.8.9;

interface IAlliance {
    function requestToJoin(
        address player,
        bytes calldata data
    ) external returns (bool);

    function playerHasLeft(address player) external;
}
