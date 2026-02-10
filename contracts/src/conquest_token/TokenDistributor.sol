// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract TokenDistributor {
    using SafeERC20 for IERC20;

    function transferTokenAlongWithNativeToken(
        IERC20 token,
        address payable to,
        uint256 amount
    ) external payable {
        token.safeTransferFrom(msg.sender, to, amount);
        to.transfer(msg.value);
    }
}
