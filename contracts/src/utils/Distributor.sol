// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract Distributor {
    using SafeERC20 for IERC20;

    function distributeVariousAmountsOfTokenAndETH(
        IERC20 token,
        address payable[] calldata tos,
        uint256[] calldata tokenAmounts,
        uint256[] calldata etherAmounts
    ) external payable returns (bool) {
        uint256 totalETHSent = 0;
        require(tos.length == tokenAmounts.length, "TOKEN_NOT_SAME_LENGTH");
        require(tos.length == etherAmounts.length, "ETH_NOT_SAME_LENGTH");
        for (uint256 i = 0; i < tos.length; i++) {
            if (tokenAmounts[i] != 0) {
                token.safeTransferFrom(msg.sender, tos[i], tokenAmounts[i]);
            }
            if (etherAmounts[i] != 0) {
                tos[i].transfer(etherAmounts[i]);
                totalETHSent += etherAmounts[i];
            }
        }
        require(msg.value == totalETHSent, "INVALID_MSG_VALUE");
        return true;
    }
}
