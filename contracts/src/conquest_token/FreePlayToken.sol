// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./IFreePlayToken.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";
import "./PlayToken.sol";

contract FreePlayToken is UsingERC20Base, IFreePlayToken, WithPermitAndFixedDomain, Proxied {
    using Address for address;
    using SafeERC20 for PlayToken;

    uint256 internal constant DECIMALS_18 = 1000000000000000000;

    event Burner(address burner, bool enabled);
    event Minter(address burner, bool enabled);
    event Admin(address account);

    PlayToken internal immutable _underlyingToken;

    mapping(address => bool) public minters;
    mapping(address => bool) public burners;

    address public admin;

    constructor(PlayToken underlyingToken, address initialAdmin) WithPermitAndFixedDomain("1") {
        _underlyingToken = underlyingToken;
        _postUpgrade(underlyingToken, initialAdmin);
    }

    function postUpgrade(PlayToken underlyingToken, address initialAdmin) external onlyProxyAdmin {
        _postUpgrade(underlyingToken, initialAdmin);
    }

    function _postUpgrade(PlayToken, address initialAdmin) internal {
        if (admin != initialAdmin) {
            admin = initialAdmin;
            emit Admin(initialAdmin);
        }
    }

    string public constant symbol = "FPLAY";

    function name() public pure override returns (string memory) {
        return "Free Play";
    }

    function setBurner(address burner, bool enabled) external {
        require(msg.sender == admin, "NOT_ALLOWED_ADMIN");
        burners[burner] = enabled;
        emit Burner(burner, enabled);
    }

    function setMinter(address minter, bool enabled) external {
        require(msg.sender == admin, "NOT_ALLOWED_ADMIN");
        minters[minter] = enabled;
        emit Minter(minter, enabled);
    }

    function setAdmin(address newAdmin) external {
        require(msg.sender == admin, "NOT_ALLOWED_ADMIN");
        admin = newAdmin;
        emit Admin(newAdmin);
    }

    function mintViaNativeToken(address to, uint256 amount) external payable {
        require(minters[msg.sender], "NOT_ALLOWED_MINTER");
        _underlyingToken.mint{value: msg.value}(address(this), amount);
        _mint(to, amount);
    }

    function mintViaNativeTokenPlusSendExtraNativeTokens(address payable to, uint256 amount) external payable {
        require(minters[msg.sender], "NOT_ALLOWED_MINTER");
        uint256 valueExpected = (amount * DECIMALS_18) / _underlyingToken.numTokensPerNativeTokenAt18Decimals();
        _underlyingToken.mint{value: valueExpected}(address(this), amount);
        _mint(to, amount);
        if (msg.value > valueExpected) {
            to.transfer(msg.value - valueExpected);
        }
    }

    function mintMultipleViaNativeTokenPlusSendExtraNativeTokens(
        address payable[] calldata tos,
        uint256[] calldata amounts,
        uint256[] calldata nativeTokenAmounts
    ) external payable {
        require(minters[msg.sender], "NOT_ALLOWED_MINTER");
        for (uint256 i = 0; i < tos.length; i++) {
            uint256 valueExpected = (amounts[i] * DECIMALS_18) / _underlyingToken.numTokensPerNativeTokenAt18Decimals();
            _underlyingToken.mint{value: valueExpected}(address(this), amounts[i]);
            _mint(tos[i], amounts[i]);
            if (nativeTokenAmounts[i] > 0) {
                tos[i].transfer(nativeTokenAmounts[i]);
            }
        }
    }

    function mint(address from, address to, uint256 amount) external {
        require(minters[msg.sender], "NOT_ALLOWED_MINTER");
        _underlyingToken.safeTransferFrom(from, address(this), amount);
        _mint(to, amount);
    }

    function burn(address from, address to, uint256 amount) external {
        require(burners[msg.sender], "NOT_ALLOWED_BURNER");
        _underlyingToken.safeTransfer(to, amount);
        _burnFrom(from, amount);
    }

    function burnMultiple(BurnFrom[] calldata list, address to) external {
        require(burners[msg.sender], "NOT_ALLOWED_BURNER");
        uint256 total = 0;
        for (uint256 i = 0; i < list.length; i++) {
            total += list[i].amount;
            _burnFrom(list[i].from, list[i].amount);
        }
        _underlyingToken.safeTransfer(to, total);
    }
}
