// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.8.9;

library Math {
    function mul(
        uint256 a,
        uint256 b,
        string memory overflowError
    ) internal pure returns (uint256 c) {
        require(b == 0 || a == 0 || ((c = a * b) / b) == a, overflowError);
    }

    function add(
        uint256 a,
        uint256 b,
        string memory overflowError
    ) internal pure returns (uint256 c) {
        require((c = a + b) >= a, overflowError);
    }

    function sub(
        uint256 a,
        uint256 b,
        string memory underflowError
    ) internal pure returns (uint256 c) {
        require((c = a - b) <= a, underflowError);
    }

    function mul18(
        uint256 a18,
        uint256 b18,
        string memory overflowError
    ) internal pure returns (uint256) {
        return mul(a18, b18, overflowError) / 10**18;
    }

    function div18(
        uint256 a18,
        uint256 b18,
        string memory overflowError
    ) internal pure returns (uint256) {
        return mul(a18, 10**18, overflowError) / b18;
    }

    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a <= b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    function smin(int256 a, int256 b) internal pure returns (int256) {
        return a <= b ? a : b;
    }

    function smax(int256 a, int256 b) internal pure returns (int256) {
        return a >= b ? a : b;
    }

    function sqrt(uint256 a) internal pure returns (uint256 c) {
        uint256 tmp = (a + 1) / 2;
        c = a;
        while (tmp < c) {
            c = tmp;
            tmp = ((a / tmp) + tmp) / 2;
        }
    }
}
