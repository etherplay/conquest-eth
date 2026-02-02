// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";
import "../events/ImportingOuterSpaceEvents.sol";

interface IOuterSpaceFleetsCommit is
    ImportingOuterSpaceTypes,
    ImportingOuterSpaceEvents
{
    function send(uint256 from, uint32 quantity, bytes32 toHash) external;

    function sendFor(FleetLaunch calldata launch) external;

    function sendWithPayee(
        uint256 from,
        uint32 quantity,
        bytes32 toHash,
        address payable payee
    ) external payable;

    function sendForWithPayee(
        FleetLaunch calldata launch,
        address payable payee
    ) external payable;

    function sendForMultipleWithPayee(
        FleetLaunch[] calldata launches,
        address payable payee
    ) external payable;
}
