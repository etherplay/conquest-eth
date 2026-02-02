// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./PaymentGateway.sol";

contract PaymentWithdrawalGateway {
    using ECDSA for bytes32;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Signer(address indexed signerAddress, bool active);

    uint256 public immutable MSG_EXPIRY;
    uint256 public immutable EXTRA_INTERVAL;
    address public owner;
    PaymentGateway public paymentGateway;
    mapping(address => bool) public signer;

    mapping(address => uint256) public lastWithdrawalTimestamp;

    constructor(
        address firstOwner,
        PaymentGateway paymentGatewayToUse,
        address firstSigner,
        uint256 msgExpiry,
        uint256 extraInterval
    ) {
        require(msgExpiry > 0 && extraInterval > 0, "INVALID_DELAY_PARAM");
        require(firstOwner != address(0), "OWNER_ZERO_ADDRESS");
        MSG_EXPIRY = msgExpiry;
        EXTRA_INTERVAL = extraInterval;
        owner = firstOwner;
        emit OwnershipTransferred(address(0), firstOwner);
        paymentGateway = paymentGatewayToUse;
        if (firstSigner != address(0)) {
            _setSigner(firstSigner, true);
        }
    }

    function transferPaymentGatewayOwnership(address newOwner) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        paymentGateway.transferOwnership(newOwner);
    }

    function setSigner(address signerAddress, bool active) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        _setSigner(signerAddress, active);
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        owner = newOwner;
        emit OwnershipTransferred(msg.sender, newOwner);
    }

    function withdraw(
        address payable to,
        uint256 maxAmount,
        uint256 msgTimestamp,
        bytes calldata signature,
        uint256 amount
    ) external {
        require(amount <= maxAmount, "TOO_MANY_REQUESTED");
        require(block.timestamp < msgTimestamp + MSG_EXPIRY, "EXPIRED");
        uint256 lastWithdrawalTime = lastWithdrawalTimestamp[msg.sender];
        require(
            block.timestamp > lastWithdrawalTime + MSG_EXPIRY + EXTRA_INTERVAL,
            "INTERVAL_NOT_RESPECTED"
        );

        bytes32 dataHash = keccak256(
            abi.encode(msgTimestamp, msg.sender, maxAmount)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash)
        );
        address msgSigner = digest.recover(signature);

        require(signer[msgSigner], "UNAUTHORIZED_SIGNER");

        // TODO this will always fail as paymentGateway owner is not this contract
        paymentGateway.withdrawForRefund(to, amount);
        lastWithdrawalTimestamp[msg.sender] = block.timestamp;
    }

    function withdrawByOwner(address payable to, uint256 amount) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        paymentGateway.withdraw(to, amount);
    }

    function withdrawAllETH(address payable to) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        paymentGateway.withdrawAllETH(to);
    }

    function withdrawTokens(IERC20[] calldata tokens, address to) external {
        require(msg.sender == owner, "NOT_ALLOWED");
        paymentGateway.withdrawTokens(tokens, to);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // INTERNAL
    // ---------------------------------------------------------------------------------------------------------------

    function _setSigner(address signerAddress, bool active) internal {
        bool current = signer[signerAddress];
        require(current != active, "ALREADY_SET");

        signer[signerAddress] = active;
        emit Signer(signerAddress, active);
    }
}
