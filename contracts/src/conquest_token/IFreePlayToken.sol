// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFreePlayToken is IERC20 {
    function mintViaNativeToken(address to, uint256 amount) external payable;

    function mintViaNativeTokenPlusSendExtraNativeTokens(
        address payable to,
        uint256 amount
    ) external payable;

    function mintMultipleViaNativeTokenPlusSendExtraNativeTokens(
        address payable[] calldata tos,
        uint256[] calldata amounts,
        uint256[] calldata nativeTokenAmounts
    ) external payable;

    function mint(address from, address to, uint256 amount) external;

    function burn(address from, address to, uint256 amount) external;

    struct BurnFrom {
        address from;
        uint256 amount;
    }

    function burnMultiple(BurnFrom[] calldata list, address to) external;
}
