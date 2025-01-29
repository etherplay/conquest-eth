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

    uint256 public immutable numSecondsPer1000ThOfATokens;
    uint256 public immutable spaceshipsToKeepPer10000;

    uint256 internal immutable _acquireNumSpaceships;
    uint256 internal immutable _productionCapAsDuration;

    struct Config {
        uint256 numSecondsPer1000ThOfATokens;
        uint256 spaceshipsToKeepPer10000;
        uint256 acquireNumSpaceships;
        uint256 productionCapAsDuration;
    }

    constructor(
        address initialOwner,
        RewardsGenerator initialGenerator,
        Config memory config
    ) UsingOwner(initialOwner) {
        generator = initialGenerator;
        numSecondsPer1000ThOfATokens = config.numSecondsPer1000ThOfATokens;
        spaceshipsToKeepPer10000 = config.spaceshipsToKeepPer10000;
        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionCapAsDuration = config.productionCapAsDuration;
    }

    struct Subscription {
        uint256 amountGiven;
        uint256 startTime;
        uint256 endTime;
    }
    mapping(address => Subscription) public subscriptions;

    mapping(uint256 => bool) public claimed;

    // --------------------------------------------------------------------------------------------
    // Subscribe to Yakuza Revenge By giving some new planets
    // --------------------------------------------------------------------------------------------

    function subscribeViaNativeTokenAndStakingToken(
        uint256[] memory locations,
        uint256 amountToMint,
        uint256 tokenAmount
    ) external payable {
        address sender = msg.sender;
        outerSpace.acquireMultipleViaNativeTokenAndStakingToken{value: msg.value}(locations, amountToMint, tokenAmount);
        uint256 contribution = amountToMint + tokenAmount;
        subscriptions[sender].amountGiven += contribution;
        if (block.timestamp > subscriptions[sender].endTime) {
            subscriptions[sender].startTime = block.timestamp;
        }
        subscriptions[sender].endTime += (numSecondsPer1000ThOfATokens * contribution) / 1e15;
    }

    // --------------------------------------------------------------------------------------------
    // Claim counter attack by providing the details of the attacking fleet and a Yakuza planet to attack from
    // --------------------------------------------------------------------------------------------

    function claimCounterAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        uint256 arrivalTimeWanted,
        bytes32 toHash
    ) external payable {
        require(!claimed[fleetId], "ALREADY_CLAIMED");
        claimed[fleetId] = true;

        require(block.timestamp < subscriptions[msg.sender].endTime, "SUBSCRIPTION_EXPIRED");

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, resolution.from);

        require(fleet.launchTime > subscriptions[msg.sender].startTime, "FLEET_NOT_COVERED");

        // TODO config
        require(block.timestamp < fleet.arrivalTime + 2 days, "TOO_LATE_TO_CLAIM");

        require(fleet.quantity > 0, "NO_FLEET");

        // We cannot do the following since attacker would send 2 fleets, one to make massive damage and then a small one to capture
        // require(amount <= fleet.quantity, "TOO_MANY_SPACESHIPS_ASKED");

        (
            ImportingOuterSpaceTypes.ExternalPlanet memory planet,
            ImportingOuterSpaceTypes.PlanetStats memory stats
        ) = outerSpace.getPlanet(from);
        uint256 cap = _capWhenActive(stats.production);
        uint256 minimumCap = (cap * spaceshipsToKeepPer10000) / 10000;

        require(planet.numSpaceships > minimumCap, "NOT_ENOUGH_SPACESHIPS");
        require(amount < planet.numSpaceships - minimumCap, "ASKING_TOO_MUCH");

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

    // --------------------------------------------------------------------------------------------
    // CONQUEST LOGIC
    // --------------------------------------------------------------------------------------------

    function _capWhenActive(uint16 production) internal view returns (uint256) {
        return _acquireNumSpaceships + (uint256(production) * _productionCapAsDuration) / 1 hours;
    }

    // function _production(bytes32 data) internal pure returns (uint16) {
    //     require(_exists(data), "PLANET_NOT_EXISTS");
    //     // TODO TRY : 1800,2100,2400,2700,3000,3300,3600, 3600, 3600, 3600,4000,4400,4800,5400,6200,7200 ?

    //     // 1800,2100,2400,2700,3000,3300,3600, 3600, 3600, 3600,4200,5400,6600,7800,9000,12000
    //     // 0x0708083409600a8c0bb80ce40e100e100e100e101068151819c81e7823282ee0
    //     return data.normal16(12, 0x0708083409600a8c0bb80ce40e100e100e100e101068151819c81e7823282ee0); // per hour
    // }

    // function _exists(bytes32 data) internal pure returns (bool) {
    //     return data.value8Mod(52, 16) == 1; // 16 => 36 so : 1 planet per 6 (=24 min unit) square
    //     // also:
    //     // 20000 average starting numSpaceships (or max?)
    //     // speed of min unit = 30 min ( 1 hour per square)
    //     // production : 20000 per 6 hours
    //     // exit : 3 days ? => 72 distance
    // }
}
