// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "hardhat-deploy/solc_0.8/diamond/UsingDiamondOwner.sol";

contract OuterSpaceAdminFacet is UsingDiamondOwner, OuterSpaceFacetBase {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function generatorAdmin() external view returns (address) {
        return _generatorAdmin();
    }

    function generator() external view returns (IOnStakeChange) {
        return IOnStakeChange(_generator());
    }

    function setGeneratorAdmin(address newAdmin) external {
        if (msg.sender != _generatorAdmin()) {
            LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
            require(msg.sender == ds.contractOwner, "NOT_AUTHORIZED");
        }
        assembly {
            // keccak256("generator.admin") - 1
            sstore(0x4b982ee4b5dc6e03929295769d2c20389d9eaa50e17bb7ede2652d727b11f4eb, newAdmin)
        }
        emit GeneratorAdminChanged(newAdmin);
    }

    function setGenerator(IOnStakeChange newGenerator) external {
        require(msg.sender == _generatorAdmin(), "NOT_AUTHORIZED");
        assembly {
            // keccak256("generator") - 1
            sstore(0x27ec6af4a6510eb9b7e0cc7f39415b7f15e430e53eb0cd3997e7c7e0cf680f6e, newGenerator)
        }
        emit GeneratorChanged(address(newGenerator));
    }

    function _generatorAdmin() internal view returns (address admin) {
        assembly {
            // keccak256("generator.admin") - 1
            admin := sload(0x4b982ee4b5dc6e03929295769d2c20389d9eaa50e17bb7ede2652d727b11f4eb)
        }
    }
}
