// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";
import "./SDAIHandler.sol";

// TODO remove
import "hardhat/console.sol";

contract PlayTokenWithOwnSAIHandler is UsingERC20Base, WithPermitAndFixedDomain, Proxied {
    uint256 internal constant DECIMALS_18 = 1000000000000000000;
    uint256 public immutable numTokensPerNativeTokenAt18Decimals;

    SDAIHandler public sdaiHandler;

    constructor(uint256 _numTokensPerNativeTokenAt18Decimals, WXDAI _wxdai, SDAI _sdai) WithPermitAndFixedDomain("1") {
        numTokensPerNativeTokenAt18Decimals = _numTokensPerNativeTokenAt18Decimals;
        _postUpgrade(_numTokensPerNativeTokenAt18Decimals, _wxdai, _sdai);
    }

    function postUpgrade(
        uint256 _numTokensPerNativeTokenAt18Decimals,
        WXDAI _wxdai,
        SDAI _sdai
    ) external onlyProxyAdmin {
        _postUpgrade(_numTokensPerNativeTokenAt18Decimals, _wxdai, _sdai);
    }

    function _postUpgrade(uint256, WXDAI _wxdai, SDAI _sdai) internal {
        if (address(_wxdai) != address(0) && address(_sdai) != address(0)) {
            sdaiHandler = new SDAIHandler(address(this), _wxdai, _sdai);
            uint256 xdaiAmount = address(this).balance;
            sdaiHandler.deposit{value: xdaiAmount}();
        }
    }

    string public constant symbol = "PLAY";

    function name() public pure override returns (string memory) {
        return "Play";
    }

    function mint(address to, uint256 amount) external payable {
        uint256 xdaiAmount = msg.value;
        require((xdaiAmount * numTokensPerNativeTokenAt18Decimals) / DECIMALS_18 == amount, "INVALID_AMOUNT");

        if (address(sdaiHandler) != address(0)) {
            sdaiHandler.deposit{value: xdaiAmount}();
        }

        _mint(to, amount);
    }

    function burn(address payable to, uint256 amount) external {
        _burnFrom(msg.sender, amount);
        uint256 xDaiAmount = (amount * DECIMALS_18) / numTokensPerNativeTokenAt18Decimals;

        if (address(sdaiHandler) != address(0)) {
            sdaiHandler.withdraw(to, amount);
        } else {
            to.transfer((amount * DECIMALS_18) / numTokensPerNativeTokenAt18Decimals);
        }
    }

    function redeemInterest(address payable to) external returns (uint256) {
        // TODO only admin
        if (address(sdaiHandler) != address(0)) {
            uint256 expectedTotalAmount = (_totalSupply * DECIMALS_18) / numTokensPerNativeTokenAt18Decimals;
            // TODO remove
            console.log("expectedTotalAmount");
            console.log(expectedTotalAmount);

            return sdaiHandler.redeemInterest(to, expectedTotalAmount);
        }
        return 0;
    }

    // TODO remove
    function nativeBalanceOf(address account) external view returns (uint256) {
        return account.balance;
    }

    // TODO remove
    function withdrawAll(address payable to) external {
        sdaiHandler.withdraw(to, type(uint256).max);
    }
}
