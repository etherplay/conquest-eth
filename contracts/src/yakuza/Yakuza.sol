// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../base/utils/UsingOwner.sol";
import "../conquest_token/RewardsGenerator.sol";
import "../outerspace/interfaces/IOuterSpace.sol";
import "../outerspace/types/ImportingOuterSpaceTypes.sol";

interface IClaim {
    function claim(address to) external;
}

contract Yakuza is UsingOwner {
    event Subscribed(address subscriber, uint256 startTime, uint256 endTime, uint256 contribution);

    RewardsGenerator public generator;
    IOuterSpace public immutable outerSpace;

    uint256 public immutable numSecondsPer1000ThOfATokens;
    uint256 public immutable spaceshipsToKeepPer10000;
    uint256 public immutable minAverageStakePerPlanet;
    uint256 public immutable maxClaimDelay;

    uint256 internal immutable _acquireNumSpaceships;
    uint256 internal immutable _productionCapAsDuration;

    struct Config {
        uint256 numSecondsPer1000ThOfATokens;
        uint256 spaceshipsToKeepPer10000;
        uint256 acquireNumSpaceships;
        uint256 productionCapAsDuration;
        uint256 minAverageStakePerPlanet;
        uint256 maxClaimDelay;
    }

    constructor(
        address initialOwner,
        RewardsGenerator initialGenerator,
        IOuterSpace initialOuterSpace,
        Config memory config
    ) UsingOwner(initialOwner) {
        generator = initialGenerator;
        outerSpace = initialOuterSpace;
        numSecondsPer1000ThOfATokens = config.numSecondsPer1000ThOfATokens;
        spaceshipsToKeepPer10000 = config.spaceshipsToKeepPer10000;
        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionCapAsDuration = config.productionCapAsDuration;
        maxClaimDelay = config.maxClaimDelay;
        minAverageStakePerPlanet = config.minAverageStakePerPlanet;
    }

    struct Subscription {
        uint256 amountGiven;
        uint256 startTime;
        uint256 endTime;
    }
    mapping(address => Subscription) public subscriptions;

    mapping(uint256 => bool) public claimed;

    // --------------------------------------------------------------------------------------------
    // Subscribe to Yakuza by giving some new planets
    // --------------------------------------------------------------------------------------------

    function subscribeViaNativeTokenAndStakingToken(
        uint256[] memory locations,
        uint256 amountToMint,
        uint256 tokenAmount
    ) external payable {
        address sender = msg.sender;
        outerSpace.acquireMultipleViaNativeTokenAndStakingToken{value: msg.value}(locations, amountToMint, tokenAmount);
        uint256 contribution = amountToMint + tokenAmount;
        uint256 averagePerPlanet = contribution / locations.length;
        require(averagePerPlanet >= minAverageStakePerPlanet, "PLANETS_TOO_SMALL");
        subscriptions[sender].amountGiven += contribution;
        uint256 startTime = subscriptions[sender].startTime;
        if (block.timestamp > subscriptions[sender].endTime) {
            startTime = block.timestamp;
            subscriptions[sender].startTime = startTime;
        }
        uint256 endTime = subscriptions[sender].endTime;
        endTime += (numSecondsPer1000ThOfATokens * contribution) / 1e15;
        subscriptions[sender].endTime = endTime;
        emit Subscribed(sender, startTime, endTime, contribution);
    }

    // --------------------------------------------------------------------------------------------
    // Claim attack by providing the details of the fleet that captured your planet
    // --------------------------------------------------------------------------------------------

    function claimAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        bytes32 toHash
    ) external payable {
        // You cannot claim the same winning fleet twice
        require(!claimed[fleetId], "ALREADY_CLAIMED");
        claimed[fleetId] = true;

        // you have to be subscribed
        require(block.timestamp < subscriptions[msg.sender].endTime, "SUBSCRIPTION_EXPIRED");

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, resolution.from);

        require(fleet.owner != address(this), "FLEET_IS_YAKUZA");
        require(fleet.defender == msg.sender, "FLEET_DID_NOT_TARGETED_YOU");

        // Fleet send before you subscribe do not count
        require(fleet.launchTime > subscriptions[msg.sender].startTime, "FLEET_NOT_COVERED");

        // There is a delay after which you cannot claim anymore
        require(block.timestamp < fleet.arrivalTime + maxClaimDelay, "TOO_LATE_TO_CLAIM");

        // the fleet need to exist
        require(fleet.quantity > 0, "NO_FLEET");

        (
            ImportingOuterSpaceTypes.ExternalPlanet memory planet,
            ImportingOuterSpaceTypes.PlanetStats memory stats
        ) = outerSpace.getPlanet(from);
        uint256 cap = _capWhenActive(stats.production);
        uint256 minimumCap = (cap * spaceshipsToKeepPer10000) / 10000;

        // There is a minimum number of spaceships Yakuza want to keep on each planet
        require(planet.numSpaceships > minimumCap, "NOT_ENOUGH_SPACESHIPS");
        require(amount < planet.numSpaceships - minimumCap, "ASKING_TOO_MUCH");

        // Revenge can only be made on actual cpature of active planets
        require(fleet.planetActive && fleet.victory, "NOT_ACTIVE_VICTORY");

        // Here we verify the validity of the fleet and its data
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

        // then we do a basic send
        // Yakuza is going to take control of the planet
        // This also ensure this cannot be abused by losing planet in purpose
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

    // --------------------------------------------------------------------------------------------
    // CONQUEST LOGIC
    // --------------------------------------------------------------------------------------------

    function _capWhenActive(uint16 production) internal view returns (uint256) {
        return _acquireNumSpaceships + (uint256(production) * _productionCapAsDuration) / 1 hours;
    }
}
