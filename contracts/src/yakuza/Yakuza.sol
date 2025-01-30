// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../conquest_token/RewardsGenerator.sol";
import "../outerspace/interfaces/IOuterSpace.sol";
import "../outerspace/types/ImportingOuterSpaceTypes.sol";
import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";

interface IClaim {
    function claim(address to) external;
}

contract Yakuza is Proxied {
    struct Config {
        uint256 numSecondsPer1000ThOfATokens;
        uint256 spaceshipsToKeepPer10000;
        uint256 acquireNumSpaceships;
        uint256 productionCapAsDuration;
        uint256 frontrunningDelay;
        uint256 minAverageStakePerPlanet;
        uint256 maxClaimDelay;
    }

    event Subscribed(address subscriber, uint256 startTime, uint256 endTime, uint256 contribution);
    event RewardReceiverSet(address newRewardReceiver);

    IOuterSpace public immutable outerSpace;

    uint256 internal immutable _acquireNumSpaceships;
    uint256 internal immutable _productionCapAsDuration;
    uint256 internal immutable _frontrunningDelay;

    uint256 public immutable numSecondsPer1000ThOfATokens;
    uint256 public immutable spaceshipsToKeepPer10000;
    uint256 public immutable minAverageStakePerPlanet;
    uint256 public immutable maxClaimDelay;

    address public rewardReceiver;
    RewardsGenerator public generator;

    constructor(
        address initialRewardReceiver,
        RewardsGenerator initialGenerator,
        IOuterSpace initialOuterSpace,
        Config memory config
    ) {
        outerSpace = initialOuterSpace;

        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionCapAsDuration = config.productionCapAsDuration;
        _frontrunningDelay = config.frontrunningDelay;

        numSecondsPer1000ThOfATokens = config.numSecondsPer1000ThOfATokens;
        spaceshipsToKeepPer10000 = config.spaceshipsToKeepPer10000;
        maxClaimDelay = config.maxClaimDelay;
        minAverageStakePerPlanet = config.minAverageStakePerPlanet;

        _postUpgrade(initialRewardReceiver, initialGenerator);
    }

    function postUpgrade(
        address initialRewardReceiver,
        RewardsGenerator initialGenerator,
        IOuterSpace,
        Config calldata
    ) external onlyProxyAdmin {
        _postUpgrade(initialRewardReceiver, initialGenerator);
    }

    function _postUpgrade(address initialRewardReceiver, RewardsGenerator initialGenerator) internal {
        rewardReceiver = initialRewardReceiver;
        generator = initialGenerator;
    }

    struct Subscription {
        uint256 amountGiven;
        uint256 startTime;
        uint256 endTime;
    }
    mapping(address => Subscription) public subscriptions;

    struct Claim {
        bool claimed;
        uint248 amountLeft;
    }
    mapping(uint256 => Claim) public claims;

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
    ) external {
        _claimAttack(fleetId, resolution, amount, from, toHash);
    }

    function claimCounterAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        bytes32 toHash,
        uint256 arrivalTimeWanted
    ) external {
        // we enforce sending back, which make such fleet visible to anyone
        bytes32 expectedToHash = keccak256(
            abi.encodePacked(bytes32(0x0), resolution.from, false, address(0), arrivalTimeWanted)
        );

        require(expectedToHash == toHash, "INVALID_TO_HASH");

        _claimAttack(fleetId, resolution, amount, from, toHash);
    }

    function _claimAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        bytes32 toHash
    ) internal {
        // You cannot claim the same winning fleet twice
        require(!claims[fleetId].claimed, "ALREADY_CLAIMED");

        // you have to be subscribed
        require(block.timestamp < subscriptions[msg.sender].endTime, "SUBSCRIPTION_EXPIRED");

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, resolution.from);

        require(fleet.owner != address(this), "FLEET_IS_YAKUZA");
        require(fleet.defender == msg.sender, "FLEET_DID_NOT_TARGETED_YOU");

        // Fleet arrived before you subscribe (minus _frontrunningDelay)
        require(fleet.arrivalTime - _frontrunningDelay > subscriptions[msg.sender].startTime, "FLEET_NOT_COVERED");

        // There is a delay after which you cannot claim anymore
        require(block.timestamp < fleet.arrivalTime + maxClaimDelay, "TOO_LATE_TO_CLAIM");

        // the fleet need to exist
        require(fleet.quantity > 0, "NO_FLEET");

        (
            ImportingOuterSpaceTypes.ExternalPlanet memory yakuzaPlanet,
            ImportingOuterSpaceTypes.PlanetStats memory statsForYakuzaPlanet
        ) = outerSpace.getPlanet(from);
        uint256 yakuzaCap = _capWhenActive(statsForYakuzaPlanet.production);
        uint256 minimumSpaceshipsToLeave = (yakuzaCap * spaceshipsToKeepPer10000) / 10000;

        // There is a minimum number of spaceships Yakuza want to keep on each planet
        require(yakuzaPlanet.numSpaceships > minimumSpaceshipsToLeave, "NOT_ENOUGH_SPACESHIPS");
        require(amount < yakuzaPlanet.numSpaceships - minimumSpaceshipsToLeave, "ASKING_TOO_MUCH");

        // Revenge can only be made on actual cpature of active planets
        require(fleet.planetActive && fleet.victory, "NOT_ACTIVE_VICTORY");

        // we give you revenge enough to capture it back
        uint256 amountLeft = claims[fleetId].amountLeft;
        if (amountLeft == 0) {
            // TODO optimize re-calculate here with genesisHash
            (, ImportingOuterSpaceTypes.PlanetStats memory statsForAttackedPlanet) = outerSpace.getPlanet(
                resolution.to
            );
            uint256 attackedPlanetCap = _capWhenActive(statsForAttackedPlanet.production);
            amountLeft = ((attackedPlanetCap * statsForAttackedPlanet.defense) / statsForYakuzaPlanet.attack) + 1;
        }
        if (amount >= amountLeft) {
            claims[fleetId].amountLeft = 0;
            claims[fleetId].claimed = true;
        } else {
            claims[fleetId].amountLeft = uint248(amountLeft - amount);
        }

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
    // Reward Receiver
    // --------------------------------------------------------------------------------------------

    function setRewardReceiver(address newRewardReceiver) external {
        require(msg.sender == rewardReceiver, "NOT_ALLOWED");
        rewardReceiver = newRewardReceiver;
        emit RewardReceiverSet(newRewardReceiver);
    }

    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // REWARDS FOR OWNER
    // --------------------------------------------------------------------------------------------
    function claimSharedPoolRewards(address to) external {
        require(msg.sender == rewardReceiver, "NOT_ALLOWED");
        generator.claimSharedPoolRewards(to);
    }

    function claimFixedRewards(address to) external {
        require(msg.sender == rewardReceiver, "NOT_ALLOWED");
        generator.claimFixedRewards(to);
    }

    // support upgrade of generator if any
    function claim(address to) external {
        require(msg.sender == rewardReceiver, "NOT_ALLOWED");
        IClaim(address(generator)).claim(to);
    }

    function changegGenerator(RewardsGenerator newGenerator) external {
        require(msg.sender == rewardReceiver, "NOT_ALLOWED");
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
