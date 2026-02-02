// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";
import "./IReward.sol";
import "../base/utils/UsingOwner.sol";

contract ConquestCredits is
    UsingOwner,
    UsingERC20Base,
    WithPermitAndFixedDomain,
    IReward
{
    event GeneratorEnabled(address generator, bool enabled);

    mapping(address => bool) public generators;

    string public constant symbol = "CRED0";

    constructor(
        address initialOwner
    ) UsingOwner(initialOwner) WithPermitAndFixedDomain("1") {}

    function name() public pure override returns (string memory) {
        return "Conquest v0 Credits";
    }

    function setGenerator(address generator, bool enabled) external onlyOwner {
        generators[generator] = enabled;
        emit GeneratorEnabled(generator, enabled);
    }

    function reward(address to, uint256 amount) external onlyGenerators {
        _mint(to, amount);
    }

    modifier onlyGenerators() {
        require(generators[msg.sender], "NOT_AUTHORIZED");
        _;
    }
}
