// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

abstract contract ERC20BaseInternal {
    function _approveFor(
        address owner,
        address target,
        uint256 amount
    ) internal virtual;

    function name() public virtual returns (string memory);

    function _mint(address to, uint256 amount) internal virtual;

    function _burnFrom(address from, uint256 amount) internal virtual;

    function _internal_totalSupply() internal view virtual returns (uint256);
}
