// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";

contract ExternalToken is UsingERC20Base, WithPermitAndFixedDomain, Proxied {
    uint256 internal constant DECIMALS_18 = 1000000000000000000;

    constructor(
        address initialOwner,
        uint256 supply
    ) WithPermitAndFixedDomain("1") {
        _postUpgrade(initialOwner, supply);
    }

    function postUpgrade(
        address initialOwner,
        uint256 supply
    ) external onlyProxyAdmin {
        _postUpgrade(initialOwner, supply);
    }

    function _postUpgrade(address initialOwner, uint256 supply) internal {
        _mint(initialOwner, supply);
    }

    string public constant symbol = "PLAY";

    function name() public pure override returns (string memory) {
        return "Play";
    }
}
