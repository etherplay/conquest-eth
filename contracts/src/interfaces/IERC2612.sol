// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IERC2612Standalone.sol";

interface IERC2612 is IERC2612Standalone, IERC20 {}
