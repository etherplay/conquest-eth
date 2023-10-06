// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../base/utils/UsingOwner.sol";
import "../conquest_token/RewardsGenerator.sol";

interface IClaim {
    function claim(address to) external;
}

contract BrainLess is UsingOwner {
    RewardsGenerator public generator;

    constructor(address initialOwner, RewardsGenerator initialGenerator) UsingOwner(initialOwner) {
        generator = initialGenerator;
    }

    function claimSharedPoolRewards(address to) external onlyOwner {
        generator.claimSharedPoolRewards(to);
    }

    function claimFixedRewards(address to) external onlyOwner {
        generator.claimFixedRewards(to);
    }

    function claim(address to) external onlyOwner {
        IClaim(address(generator)).claim(to);
    }

    function changegGenerator(RewardsGenerator newGenerator) external onlyOwner {
        generator = newGenerator;
    }
}
