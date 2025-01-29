// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../types/ImportingOuterSpaceTypes.sol";

interface IOuterSpaceStaking is ImportingOuterSpaceTypes {
    function onTokenTransfer(address, uint256 amount, bytes calldata data) external returns (bool);

    function onTokenPaidFor(address, address forAddress, uint256 amount, bytes calldata data) external returns (bool);

    function acquireViaTransferFrom(uint256 location, uint256 amount) external;

    function acquireViaFreeTokenTransferFrom(uint256 location, uint256 amount) external;

    function acquireViaNativeTokenAndStakingToken(
        uint256 location,
        uint256 amountToMint,
        uint256 tokenAmount
    ) external payable;

    function acquireMultipleViaNativeTokenAndStakingToken(
        uint256[] memory locations,
        uint256 amountToMint,
        uint256 tokenAmount
    ) external payable;

    function exitFor(address owner, uint256 location) external;

    function exitMultipleFor(address owner, uint256[] calldata locations) external;

    function fetchAndWithdrawFor(address owner, uint256[] calldata locations) external;

    function balanceToWithdraw(address owner) external view returns (uint256);

    function withdrawFor(address owner) external;
}
