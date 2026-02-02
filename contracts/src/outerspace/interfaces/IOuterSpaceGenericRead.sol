// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

interface IOuterSpaceGenericRead {
    function read(uint256 slot) external view returns (bytes32 data);

    function readMultiple(
        uint256[] calldata slots
    ) external view returns (bytes32[] memory data);

    function readRange(
        uint256 start,
        uint256 num
    ) external view returns (bytes32[] memory data);
}
