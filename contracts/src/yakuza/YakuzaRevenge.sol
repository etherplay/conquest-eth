// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../base/utils/UsingOwner.sol";
import "../conquest_token/RewardsGenerator.sol";
import "../outerspace/interfaces/IOuterSpace.sol";
import "../outerspace/types/ImportingOuterSpaceTypes.sol";

interface IClaim {
    function claim(address to) external;
}

contract YakuzaRevenge is UsingOwner {
    RewardsGenerator public generator;
    IOuterSpace public outerSpace;

    constructor(
        address initialOwner,
        RewardsGenerator initialGenerator,
        uint256 timePerAmount
    ) UsingOwner(initialOwner) {
        generator = initialGenerator;
    }

    struct Subscription {
        uint256 amount;
        uint256 endTime;
    }
    mapping(address => Subscription) _subscriptions;

    mapping(uint256 => bool) _claimed;

    // --------------------------------------------------------------------------------------------
    // YAKUZA SUBSCRIPTION
    // --------------------------------------------------------------------------------------------

    function subscribe() external payable {
        _subscriptions[msg.sender].amount += msg.value;
        _subscriptions[msg.sender].endTime += msg.value * 10;
    }

    function claimCounterAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        uint256 arrivalTimeWanted,
        bytes32 toHash
    ) external payable {
        require(!_claimed[fleetId], "ALREADY_CLAIMED");
        _claimed[fleetId] = true;

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, resolution.from);

        // TODO config
        require(block.timestamp < fleet.arrivalTime + 2 days, "TOO_LATE_TO_CLAIM");
        // (ImportingOuterSpaceTypes.ExternalPlanet memory planet,) = outerSpace.getPlanet(resolution.to);

        require(fleet.quantity > 0, "NO_FLEET");
        require(amount <= fleet.quantity, "TOO_MANY_SPACESHIPS_ASKED");
        require(fleet.planetActive && fleet.victory, "NOT_ACTIVE_VICTORY");
        require(
            uint256(
                keccak256(
                    abi.encodePacked(
                        keccak256(
                            abi.encodePacked(
                                resolution.secret,
                                resolution.to,
                                resolution.gift,
                                resolution.specific,
                                resolution.arrivalTimeWanted
                            )
                        ),
                        resolution.from,
                        resolution.fleetSender,
                        resolution.operator
                    )
                )
            ) == fleetId,
            "INVALID_FLEET_DATA_OR_SECRET"
        );

        // we enforce sending back, which make such fleet visible to anyone
        bytes32 expectedToHash = keccak256(
            abi.encodePacked(bytes32(0x0), resolution.from, false, address(0), arrivalTimeWanted)
        );

        require(expectedToHash == toHash, "INVALID_TO_HASH");

        // basic send, Yakuza is going to take control of the planet
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
