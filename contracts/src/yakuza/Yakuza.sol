// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../base/utils/UsingOwner.sol";
import "../conquest_token/RewardsGenerator.sol";
import "../outerspace/interfaces/IOuterSpace.sol";

interface IClaim {
    function claim(address to) external;
}

contract Yakuza is UsingOwner {
    RewardsGenerator public generator;
    IOuterSpace public outerSpace;

    constructor(address initialOwner, RewardsGenerator initialGenerator) UsingOwner(initialOwner) {
        generator = initialGenerator;
    }

    struct Subscription {
        uint256 amount;
        uint256 endTime;
        uint256 claimed;
        uint256 share;
    }
    mapping(address => Subscription) _subscriptions;

    // --------------------------------------------------------------------------------------------
    // YAKUZA SUBSCRIPTION
    // --------------------------------------------------------------------------------------------

    function subscribe() external payable {
        _subscriptions[msg.sender].amount += msg.value;
    }

    function claimCounterAttack(
        uint256 fleetId,
        uint256 fleetOrigin,
        uint32 amount,
        uint256 from,
        bytes32 toHash
    ) external payable {
        (
            address owner,
            uint40 launchTime,
            uint32 quantity,
            uint64 flyingAtLaunch, // can be more than quantity if multiple fleet were launched around the same time from the same planet
            uint64 destroyedAtLaunch
        ) = outerSpace.getFleet(fleetId, fleetOrigin);

        _subscriptions[msg.sender].claimed -= amount;
        outerSpace.send(from, amount, toHash);
    }

    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // REWARDS FOR OWNER
    // --------------------------------------------------------------------------------------------
    function claimSharedPoolRewards(address to) external onlyOwner {
        generator.claimSharedPoolRewards(to);
    }

    function claimFixedRewards(address to) external onlyOwner {
        generator.claimFixedRewards(to);
    }

    // support upgrade of generator if any
    function claim(address to) external onlyOwner {
        IClaim(address(generator)).claim(to);
    }

    function changegGenerator(RewardsGenerator newGenerator) external onlyOwner {
        generator = newGenerator;
    }
    // --------------------------------------------------------------------------------------------
}
