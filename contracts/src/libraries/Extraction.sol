// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.8.9;

// TODO remove
import "hardhat/console.sol";

library Extraction {
    function value(
        bytes32 data,
        uint8 leastSignificantBit,
        uint8 size
    ) internal pure returns (uint256) {
        return uint256((data >> leastSignificantBit)) % 2 ** size;
    }

    function value8Mod(
        bytes32 data,
        uint8 leastSignificantBit,
        uint8 mod
    ) internal pure returns (uint8) {
        return uint8(uint256((data >> leastSignificantBit)) % mod);
    }

    function value8(
        bytes32 data,
        uint8 leastSignificantBit
    ) internal pure returns (uint8) {
        return uint8(uint256((data >> leastSignificantBit)) % 2 ** 8);
    }

    // 1+1+2+3+4+6+7+8+8+7+6+4+3+2+1+1 // aproximation of normal distribution with mean=7.5 and standard deviation=3 for 16 values
    bytes32 constant n_m7_5_sd3 =
        0x01223334444555555666666677777777888888889999999AAAAAABBBBCCCDDEF;

    function normal8(
        bytes32 data,
        uint8 leastSignificantBit
    ) internal pure returns (uint8) {
        uint8 index = value8Mod(data, leastSignificantBit, 64);
        uint8 first = index / 2;
        uint8 second = index % 2;
        uint8 slot = uint8(n_m7_5_sd3[first]);
        if (second == 0) {
            return slot >> 4;
        } else {
            return slot % 16;
        }
    }

    function normal16(
        bytes32 data,
        uint8 leastSignificantBit,
        bytes32 selection
    ) internal pure returns (uint16) {
        uint8 index = normal8(data, leastSignificantBit);
        return
            uint16(uint8(selection[index * 2])) * 2 ** 8 +
            uint16(uint8(selection[index * 2 + 1]));
    }
}
