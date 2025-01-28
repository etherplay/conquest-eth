// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpaceGenericRead.sol";

contract OuterSpaceGenericReadFacet is OuterSpaceFacetBase, IOuterSpaceGenericRead {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function read(uint256 slot) external view returns (bytes32 data) {
        assembly {
            data := sload(slot)
        }
    }

    function readMultiple(uint256[] calldata slots) external view returns (bytes32[] memory data) {
        data = new bytes32[](slots.length);
        assembly {
            let slotsOffset := slots.offset
            let slotsLength := slots.length
            let dataPtr := add(data, 32)

            for {
                let i := 0
            } lt(i, slotsLength) {
                i := add(i, 1)
            } {
                let slot := calldataload(add(slotsOffset, mul(i, 32)))
                mstore(dataPtr, sload(slot))
                dataPtr := add(dataPtr, 32)
            }
        }
    }

    function readRange(uint256 start, uint256 num) external view returns (bytes32[] memory data) {
        data = new bytes32[](num);
        for (uint256 i = 0; i < num; i++) {
            assembly {
                mstore(add(data, add(32, mul(i, 32))), sload(add(start, i)))
            }
        }
    }
}
