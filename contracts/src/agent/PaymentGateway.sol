// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentGateway {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Payment(address indexed payer, uint256 amount, bool refund);

    address public owner;

    constructor(address firstOwner) {
        owner = firstOwner;
        emit OwnershipTransferred(address(0), firstOwner);
    }

    receive() external payable {
        emit Payment(msg.sender, msg.value, false);
    }

    // sendETHandRegisterDelegate(address delegate) external payable {
    //     emit Payment(msg.sender, delegate, msg.value, false);
    // }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        owner = newOwner;
        emit OwnershipTransferred(msg.sender, newOwner);
    }

    function withdrawForRefund(address payable to, uint256 amount) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        to.transfer(amount);
        emit Payment(to, amount, true);
    }

    function withdraw(address payable to, uint256 amount) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        to.transfer(amount);
    }

    function withdrawAllETH(address payable to) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        to.transfer(address(this).balance);
    }

    function withdrawTokens(IERC20[] calldata tokens, address to) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = tokens[i].balanceOf(address(this));
            tokens[i].transfer(to, balance);
        }
    }
}
