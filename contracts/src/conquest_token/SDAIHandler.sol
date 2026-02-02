// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// TODO remove
import "hardhat/console.sol";

interface WXDAI is IERC20 {
    function deposit() external payable;

    function withdraw(uint wad) external;
}

interface SDAI {
    function deposit(
        uint256 assets,
        address receiver
    ) external returns (uint256);

    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256);

    function maxWithdraw(address owner) external view returns (uint256);
}

contract SDAIHandler {
    address public immutable manager;
    WXDAI public immutable wxdai;
    SDAI public immutable sDAI;

    receive() external payable {}

    fallback() external payable {}

    constructor(address _manager, WXDAI _wxdai, SDAI _sdai) {
        manager = _manager;
        wxdai = _wxdai;
        sDAI = _sdai;

        wxdai.approve(address(sDAI), type(uint256).max);
    }

    function deposit() external payable {
        require(msg.sender == manager, "NOT_AUTHORIZED");
        uint256 amount = msg.value;
        wxdai.deposit{value: amount}();
        sDAI.deposit(amount, address(this));
    }

    function withdraw(address payable to, uint256 amount) external {
        require(msg.sender == manager, "NOT_AUTHORIZED");
        uint256 maxAmount = sDAI.maxWithdraw(address(this));
        amount = (amount > maxAmount) ? maxAmount : amount;

        sDAI.withdraw(amount, address(this), address(this));
        uint256 balance = wxdai.balanceOf(address(this));
        wxdai.withdraw(balance);
        // (bool sent, ) = to.call{value: balance}("");
        // require(sent, "Failed to send xDAI");
        to.transfer(balance);
    }

    function redeemInterest(
        address payable to,
        uint256 expectedTotalAmount
    ) external returns (uint256) {
        require(msg.sender == manager, "NOT_AUTHORIZED");

        uint256 maxXDaiAmount = sDAI.maxWithdraw(address(this));
        // TODO remove
        console.log("maxXDaiAmount");
        console.log(maxXDaiAmount);
        if (maxXDaiAmount > expectedTotalAmount) {
            uint256 totalToWithdraw = maxXDaiAmount - expectedTotalAmount;
            sDAI.withdraw(totalToWithdraw, address(this), address(this));
            uint256 balance = wxdai.balanceOf(address(this));
            wxdai.withdraw(balance);
            // to.transfer(balance);
            (bool sent, ) = to.call{value: balance}("");
            require(sent, "Failed to send xDAI");
            return balance;
        }
        return 0;
    }
}
