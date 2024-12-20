// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./IOuterSpaceFleetsRead.sol";
import "./IOuterSpaceFleetsCommit.sol";
import "./IOuterSpaceFleetsReveal.sol";
import "./IOuterSpacePlanets.sol";

// solhint-disable-next-line no-empty-blocks
interface IOuterSpace is IOuterSpaceFleetsRead, IOuterSpaceFleetsCommit, IOuterSpaceFleetsReveal, IOuterSpacePlanets {

}
