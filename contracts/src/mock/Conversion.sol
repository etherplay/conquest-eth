// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "hardhat/console.sol";

contract TestConversion {
    function _convertLoc2XY(
        uint256 location
    ) internal pure returns (int128 x, int128 y) {
        x = int128(int256(location & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF));
        y = int128(int256(location >> 128));
    }

    function _convertXY2Loc(
        int128 x,
        int128 y
    ) internal pure returns (uint256 location) {
        // unchecked {location = uint256(int256(x)) + uint256(int256(y) << 128);}
        unchecked {
            location = uint256(uint128(x)) + (uint256(uint128(y)) << 128);
        }
    }

    function _convertLocationToLocation(
        uint256 location
    ) internal pure returns (uint256 newLocation) {
        (int128 ix, int128 iy) = _convertLoc2XY(location);
        return _convertXY2Loc(ix, iy);
    }

    function testConversion(uint256 location) external view {
        console.logUint(location);
        (int128 x, int128 y) = _convertLoc2XY(location);

        console.logInt(x);
        console.logInt(y);

        int256 x256 = int256(location & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF);
        int256 y256 = int256(location >> 128);
        // console.log("x256 %i y256 %i", x256, y256);
        console.logInt(x256);
        console.logInt(y256);

        uint256 newLocation = _convertXY2Loc(x, y);
        console.logUint(newLocation);
        console.logBytes32(bytes32(newLocation));

        if (location != newLocation) {
            console.log("error");
        }
    }
}
