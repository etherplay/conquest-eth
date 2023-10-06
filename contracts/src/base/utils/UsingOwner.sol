// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "../../interfaces/IERC165.sol";

contract UsingOwner is IERC165 {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    address public owner;

    constructor(address _owner) {
        _transferOwnership(_owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        _transferOwnership(newOwner);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_AUTHORIZED");
        _;
    }

    function supportsInterface(bytes4 interfaceID) external pure virtual override returns (bool) {
        return interfaceID == 0x7f5828d0 || interfaceID == 0x01ffc9a7;
    }

    function _transferOwnership(address newOwner) internal {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
