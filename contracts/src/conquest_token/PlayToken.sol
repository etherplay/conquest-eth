// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";

interface SavingsXDaiAdapter {
    function depositXDAI(address receiver) external payable returns (uint256);

    function withdrawXDAI(
        uint256 assets,
        address receiver
    ) external payable returns (uint256);
}

interface SDAI is IERC20 {
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

contract PlayToken is UsingERC20Base, WithPermitAndFixedDomain, Proxied {
    uint256 internal constant DECIMALS_18 = 1000000000000000000;
    uint256 public immutable numTokensPerNativeTokenAt18Decimals;

    SavingsXDaiAdapter public immutable sdaiAdapter;
    SDAI public immutable sdai;

    constructor(
        address initialRedeemer,
        uint256 _numTokensPerNativeTokenAt18Decimals,
        SDAI _sdai,
        SavingsXDaiAdapter _sdaiAdapter
    ) WithPermitAndFixedDomain("1") {
        numTokensPerNativeTokenAt18Decimals = _numTokensPerNativeTokenAt18Decimals;
        sdai = _sdai;
        sdaiAdapter = _sdaiAdapter;
        _postUpgrade(
            initialRedeemer,
            numTokensPerNativeTokenAt18Decimals,
            _sdai,
            _sdaiAdapter
        );
    }

    function postUpgrade(
        address initialRedeemer,
        uint256 _numTokensPerNativeTokenAt18Decimals,
        SDAI _sdai,
        SavingsXDaiAdapter _sdaiAdapter
    ) external onlyProxyAdmin {
        _postUpgrade(
            initialRedeemer,
            _numTokensPerNativeTokenAt18Decimals,
            _sdai,
            _sdaiAdapter
        );
    }

    function _postUpgrade(
        address initialRedeemer,
        uint256,
        SDAI,
        SavingsXDaiAdapter
    ) internal {
        if (_redeemer() != initialRedeemer) {
            assembly {
                // keccak256("play.redeemer") - 1
                sstore(
                    0xa38643e3ed511bdab6502b0aaa1583180356304eba44dc9c3bbd0d9bf66e67f9,
                    initialRedeemer
                )
            }
            emit Redeemer(initialRedeemer);
        }

        if (address(sdai) != address(0) && address(sdaiAdapter) != address(0)) {
            sdai.approve(address(sdaiAdapter), type(uint256).max);
            uint256 xdaiAmount = address(this).balance;
            sdaiAdapter.depositXDAI{value: xdaiAmount}(address(this));
        }
    }

    string public constant symbol = "PLAY";

    function name() public pure override returns (string memory) {
        return "Play";
    }

    function mint(address to, uint256 amount) external payable {
        uint256 xdaiAmount = msg.value;
        require(
            (xdaiAmount * numTokensPerNativeTokenAt18Decimals) / DECIMALS_18 ==
                amount,
            "INVALID_AMOUNT"
        );

        if (address(sdai) != address(0) && address(sdaiAdapter) != address(0)) {
            sdaiAdapter.depositXDAI{value: xdaiAmount}(address(this));
        }

        _mint(to, amount);
    }

    function burn(address payable to, uint256 amount) external {
        _burnFrom(msg.sender, amount);
        uint256 xDaiAmount = (amount * DECIMALS_18) /
            numTokensPerNativeTokenAt18Decimals;

        if (address(sdai) != address(0) && address(sdaiAdapter) != address(0)) {
            sdaiAdapter.withdrawXDAI(xDaiAmount, to);
        } else {
            to.transfer(xDaiAmount);
        }
    }

    function redeemInterest(address payable to) external returns (uint256) {
        require(msg.sender == _redeemer(), "NOT_AUTHORIZED");
        if (address(sdai) != address(0) && address(sdaiAdapter) != address(0)) {
            uint256 expectedTotalAmount = (_totalSupply * DECIMALS_18) /
                numTokensPerNativeTokenAt18Decimals;

            uint256 maxXDaiAmount = sdai.maxWithdraw(address(this));
            if (maxXDaiAmount > expectedTotalAmount) {
                uint256 totalToWithdraw = maxXDaiAmount - expectedTotalAmount;
                sdaiAdapter.withdrawXDAI(totalToWithdraw, to);
                return totalToWithdraw;
            }
        }
        return 0;
    }

    function interestAvailableToRedeem() external view returns (uint256) {
        if (address(sdai) != address(0) && address(sdaiAdapter) != address(0)) {
            uint256 expectedTotalAmount = (_totalSupply * DECIMALS_18) /
                numTokensPerNativeTokenAt18Decimals;
            uint256 maxXDaiAmount = sdai.maxWithdraw(address(this));
            if (maxXDaiAmount > expectedTotalAmount) {
                uint256 totalToWithdraw = maxXDaiAmount - expectedTotalAmount;
                return totalToWithdraw;
            }
        }
        return 0;
    }

    event Redeemer(address newRedeemer);

    function _redeemer() internal view returns (address redeemerAddress) {
        assembly {
            // keccak256("play.redeemer") - 1
            redeemerAddress := sload(
                0xa38643e3ed511bdab6502b0aaa1583180356304eba44dc9c3bbd0d9bf66e67f9
            )
        }
    }

    function setRedeemer(address newRedeemer) external {
        require(msg.sender == _redeemer(), "NOT_AUTHORIZED");
        assembly {
            // keccak256("play.redeemer") - 1
            sstore(
                0xa38643e3ed511bdab6502b0aaa1583180356304eba44dc9c3bbd0d9bf66e67f9,
                newRedeemer
            )
        }
        emit Redeemer(newRedeemer);
    }
}
