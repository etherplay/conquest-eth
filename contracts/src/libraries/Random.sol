// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.8.9;

import "./Math.sol";

library Random {
    using Math for uint256;

    function r_u8(
        bytes32 seed,
        uint256 r,
        uint8 i,
        uint256 mod
    ) internal pure returns (uint8) {
        return uint8(uint256(keccak256(abi.encodePacked(r, seed, i))) % mod);
    }

    function r_u256(
        bytes32 seed,
        uint256 r,
        uint8 i,
        uint256 mod
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(r, seed, i))) % mod;
    }

    function r_u256_minMax(
        bytes32 seed,
        uint256 r,
        uint8 i,
        uint256 min,
        uint256 max
    ) internal pure returns (uint256) {
        uint256 range = max.sub(min, "MAX_LT_MIN");
        return min.add(r_u256(seed, r, i, range), "MAX_OVERFLOW");
    }

    // 1+1+2+3+4+6+7+8+8+7+6+4+3+2+1+1 // aproximation of normal distribution with mean=7.5 and standard deviation=3 for 16 values
    bytes32 constant n_m7_5_sd3 = 0x01223334444555555666666677777777888888889999999AAAAAABBBBCCCDDEF;

    function r_normal(
        bytes32 seed,
        uint256 r,
        uint8 i
    ) internal pure returns (uint8) {
        uint8 index = r_u8(seed, r, i, 64);
        uint8 first = index / 2;
        uint8 second = index % 2;
        uint8 slot = uint8(n_m7_5_sd3[first]);
        uint8 value;
        if (second == 0) {
            value = slot >> 4;
        } else {
            value = slot % 16;
        }
        return value;
    }

    function r_normalFrom(
        bytes32 seed,
        uint256 r,
        uint8 i,
        bytes32 selection
    ) internal pure returns (uint16) {
        uint8 index = r_normal(seed, r, i);
        return uint16(uint8(selection[index * 2])) * 2**8 + uint16(uint8(selection[index * 2 + 1]));
    }
}
