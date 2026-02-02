// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../base/utils/UsingOwner.sol";
import "./PlayToken.sol";
import "./FreePlayToken.sol";

contract FreePlayTokenClaim is IERC20, UsingOwner {
    uint256 internal _totalSupply;
    mapping(address => uint256) internal _balances;

    PlayToken immutable _underlyingToken;
    FreePlayToken immutable _freePlayToken;

    constructor(
        address initialOwner,
        PlayToken underlyingToken,
        FreePlayToken freePlayToekn
    ) UsingOwner(initialOwner) {
        _underlyingToken = underlyingToken;
        _freePlayToken = freePlayToekn;
    }

    string public constant symbol = "CLAIM";

    function name() public pure returns (string memory) {
        return "Free Play Claim";
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) external view override returns (uint256) {
        return _balances[owner];
    }

    function allowance(
        address,
        address
    ) external pure override returns (uint256) {
        return 0;
    }

    function decimals() external pure virtual returns (uint8) {
        return uint8(18);
    }

    function transfer(address, uint256) external returns (bool) {
        revert("NON_TRANSFERABLE");
    }

    function approve(address, uint256) external returns (bool) {
        revert("NON_TRANSFERABLE");
    }

    function transferFrom(address, address, uint256) external returns (bool) {
        revert("NON_TRANSFERABLE");
    }

    // --------------------------------------------------------------------------------------------

    function mintViaNativeToken(address to, uint256 amount) external payable {
        _underlyingToken.mint{value: msg.value}(address(this), amount);

        // we increase the balance ( + total supply)
        _totalSupply = _totalSupply + amount;
        _balances[to] = _balances[to] + amount;
        emit Transfer(address(0), to, amount);
    }

    struct Claim {
        address to;
        uint256 amount;
    }

    function mintMultipleViaNativeToken(
        Claim[] calldata claims
    ) external payable {
        uint256 numClaims = claims.length;
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < numClaims; i++) {
            uint256 amount = claims[i].amount;
            address to = claims[i].to;

            totalAmount += amount;
            _balances[to] = _balances[to] + amount;
            emit Transfer(address(0), to, amount);
        }
        _underlyingToken.mint{value: msg.value}(address(this), totalAmount);
        _totalSupply = _totalSupply + totalAmount;
    }

    function claim(address to, uint256 amount) external {
        address from = msg.sender;
        require(_balances[from] >= amount, "INSUFFICIENT_BALANCE");

        // we reduce the balance (+ total supply)
        _totalSupply = _totalSupply - amount;
        _balances[from] = _balances[from] - amount;
        emit Transfer(from, address(0), amount);

        // we approve _freePlayToken to transfer token
        _underlyingToken.approve(address(_freePlayToken), amount);
        // we then ask freePlayToken to be minted from the underlying token
        _freePlayToken.mint(address(this), to, amount);
    }

    function withdrawAllUnderlyingToken(
        address[] calldata froms,
        address to
    ) external {
        require(msg.sender == owner, "NOT_AUTHORIZED");

        uint256 total = 0;
        for (uint256 i = 0; i < froms.length; i++) {
            address from = froms[i];
            uint256 amount = _balances[from];
            // we reduce the balance (+ total supply)
            _balances[from] = 0;
            total += amount;
            emit Transfer(from, address(0), amount);
        }
        _totalSupply = _totalSupply - total;
        _underlyingToken.transfer(to, total);
    }

    function withdrawUnderlyingToken(
        address from,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == owner, "NOT_AUTHORIZED");
        require(_balances[from] >= amount, "INSUFFICIENT_BALANCE");

        // we reduce the balance (+ total supply)
        _totalSupply = _totalSupply - amount;
        _balances[from] = _balances[from] - amount;
        emit Transfer(from, address(0), amount);

        _underlyingToken.transfer(to, amount);
    }
}
