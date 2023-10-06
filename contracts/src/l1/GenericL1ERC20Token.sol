// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";

// TODO bridging
contract GenericL1ERC20Token is UsingERC20Base, WithPermitAndFixedDomain {
    using Address for address;

    address internal immutable _gateway; // TODO proper bridging
    address internal immutable _l2Contract; // TODO proper bridging

    constructor(address gateway, address l2Contract) WithPermitAndFixedDomain("1") {
        _gateway = gateway;
        _l2Contract = l2Contract;
    }

    string public constant symbol = "XCQT"; //xdai example

    function name() public pure override returns (string memory) {
        return "Conquest's Token For xdai";
    }

    // ----------------------------------------------------------------------
    // TODO remove
    // ----------------------------------------------------------------------
    mapping(address => bool) public authorized;
    bool public requireAuthorization;
    mapping(address => bool) public touched;

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(!requireAuthorization || authorized[from] || authorized[to] || !touched[to], "NOT_AUTHORIZED_TRANSFER");
        super._transfer(from, to, amount);
        touched[to] = true;
    }

    function anyNotAuthorized(address[] memory accounts) external view returns (bool) {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (!authorized[accounts[i]]) {
                return true;
            }
        }
        return false;
    }

    function authorize(address[] memory accounts, bool auth) public {
        require(msg.sender == _admin(), "NOT_ADMIN");
        for (uint256 i = 0; i < accounts.length; i++) {
            authorized[accounts[i]] = auth;
        }
    }

    function enableRequireAuthorization(address[] calldata accounts) external {
        require(msg.sender == _admin(), "NOT_ADMIN");
        setRequireAuthorization(true);
        authorize(accounts, true);
    }

    function setRequireAuthorization(bool req) public {
        require(msg.sender == _admin(), "NOT_ADMIN");
        requireAuthorization = req;
    }

    function _admin() internal view returns (address adminAddress) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            adminAddress := sload(0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103)
        }
    }
    // ----------------------------------------------------------------------
}
