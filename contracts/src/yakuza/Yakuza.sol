// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../conquest_token/RewardsGenerator.sol";
import "../conquest_token/PlayToken.sol";
import "../outerspace/interfaces/IOuterSpace.sol";
import "../outerspace/types/ImportingOuterSpaceTypes.sol";
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";
import "../libraries/Extraction.sol";

interface IClaim {
    function claim(address to) external;
}

contract Yakuza is UsingERC20Base, WithPermitAndFixedDomain, Proxied {
    using Extraction for bytes32;

    // --------------------------------------------------------------------------------------------
    // TYPES
    // --------------------------------------------------------------------------------------------
    struct Config {
        // OuterSpace Config
        bytes32 genesis;
        uint256 acquireNumSpaceships;
        uint256 productionCapAsDuration;
        uint256 frontrunningDelay;
        uint256 timePerDistance;
        uint256 productionSpeedUp;
        // Yakuza Config
        uint256 numSecondsPerTokens;
        uint256 spaceshipsToKeepPer10000;
        uint256 minAverageStakePerPlanet;
        uint256 maxClaimDelay;
        uint256 minimumSubscriptionWhenStaking;
        uint256 minimumSubscriptionWhenNotStaking;
        uint256 maxTimeRange;
        uint256 minAttackAmount;
    }
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------------------------------------
    event YakuzaSubscribed(
        address indexed subscriber,
        uint256 startTime,
        uint256 endTime,
        uint256 contribution,
        uint256[] planets
    );
    event YakuzaClaimed(
        address indexed sender,
        uint256 indexed fleetId,
        uint256 indexed attackedPlanet,
        uint256 fleetSentId,
        uint256 amount,
        uint256 amountLeft,
        uint256 lockTime,
        bytes32 secret
    );

    event YakuzaAttack(
        address indexed sender,
        uint256 indexed to,
        uint256 fleetSentId,
        uint256 amountSent,
        uint256 lastAttackTime,
        bytes32 secret
    );

    event RewardReceiverSet(address newRewardReceiver);
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // IMMUTABLES
    // --------------------------------------------------------------------------------------------
    IOuterSpace internal immutable outerSpace;
    PlayToken internal immutable playToken;

    bytes32 internal immutable _genesis;
    uint256 internal immutable _acquireNumSpaceships;
    uint256 internal immutable _productionCapAsDuration;
    uint256 internal immutable _frontrunningDelay;
    uint256 internal immutable _timePerDistance;
    uint256 internal immutable _productionSpeedUp;

    uint256 internal immutable numSecondsPerTokens;
    uint256 internal immutable spaceshipsToKeepPer10000;
    uint256 internal immutable minAverageStakePerPlanet;
    uint256 internal immutable maxClaimDelay;
    uint256 internal immutable minimumSubscriptionWhenStaking;
    uint256 internal immutable minimumSubscriptionWhenNotStaking;
    uint256 internal immutable maxTimeRange;
    uint256 internal immutable minAttackAmount;
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // STATE VARIABLES
    // --------------------------------------------------------------------------------------------
    address public rewardReceiver;
    RewardsGenerator internal generator;

    struct Subscription {
        uint256 startTime;
        uint256 endTime;
    }
    mapping(address => Subscription) public subscriptions;

    struct Claim {
        bool claimed;
        uint248 amountLeft;
    }
    mapping(uint256 => Claim) public claims;

    struct MyPlanet {
        bool mine;
        uint40 lastAttackTime;
        uint40 lockTime;
    }
    mapping(uint256 => MyPlanet) public myPlanets;

    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(
        address initialRewardReceiver,
        RewardsGenerator initialGenerator,
        IOuterSpace initialOuterSpace,
        PlayToken initialPlayToken,
        Config memory config
    ) WithPermitAndFixedDomain("1") {
        outerSpace = initialOuterSpace;
        playToken = initialPlayToken;

        _genesis = config.genesis;
        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionCapAsDuration = config.productionCapAsDuration;
        _frontrunningDelay = config.frontrunningDelay;
        uint32 t = uint32(config.timePerDistance) / 4; // the coordinates space is 4 times bigger
        require(t * 4 == config.timePerDistance, "TIME_PER_DIST_NOT_DIVISIBLE_4");
        _timePerDistance = t;
        _productionSpeedUp = config.productionSpeedUp;

        numSecondsPerTokens = config.numSecondsPerTokens;
        spaceshipsToKeepPer10000 = config.spaceshipsToKeepPer10000;
        maxClaimDelay = config.maxClaimDelay;
        minAverageStakePerPlanet = config.minAverageStakePerPlanet;
        minimumSubscriptionWhenStaking = config.minimumSubscriptionWhenStaking;
        minimumSubscriptionWhenNotStaking = config.minimumSubscriptionWhenNotStaking;
        maxTimeRange = config.maxTimeRange;
        minAttackAmount = config.minAttackAmount;

        _postUpgrade(initialRewardReceiver, initialGenerator);
    }

    function postUpgrade(
        address initialRewardReceiver,
        RewardsGenerator initialGenerator,
        IOuterSpace,
        PlayToken,
        Config calldata
    ) external onlyProxyAdmin {
        _postUpgrade(initialRewardReceiver, initialGenerator);
    }

    function _postUpgrade(address initialRewardReceiver, RewardsGenerator initialGenerator) internal {
        rewardReceiver = initialRewardReceiver;
        generator = initialGenerator;
    }

    // --------------------------------------------------------------------------------------------

    // function getConfig() external view returns (Config memory) {
    //     return
    //         Config({
    //             // OuterSpace Config
    //             genesis: _genesis,
    //             acquireNumSpaceships: _acquireNumSpaceships,
    //             productionCapAsDuration: _productionCapAsDuration,
    //             frontrunningDelay: _frontrunningDelay,
    //             timePerDistance: _timePerDistance,
    //             productionSpeedUp: _productionSpeedUp,
    //             // Yakuza Config
    //             numSecondsPerTokens: numSecondsPerTokens,
    //             spaceshipsToKeepPer10000: spaceshipsToKeepPer10000,
    //             minAverageStakePerPlanet: minAverageStakePerPlanet,
    //             maxClaimDelay: maxClaimDelay,
    //             minimumSubscriptionWhenStaking: minimumSubscriptionWhenStaking,
    //             minimumSubscriptionWhenNotStaking: minimumSubscriptionWhenNotStaking,
    //             maxTimeRange: maxTimeRange,
    //             minAttackAmount: minAttackAmount
    //         });
    // }

    // --------------------------------------------------------------------------------------------
    // ERC20
    // --------------------------------------------------------------------------------------------
    string public constant symbol = "YKZ1";

    function name() public pure override returns (string memory) {
        return "YAKUZA1";
    }

    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // Subscribe to Yakuza
    // --------------------------------------------------------------------------------------------

    function subscribeWithoutStaking(uint256 amountToMint, uint256 tokenAmount) external payable {
        require(tokenAmount + amountToMint >= minimumSubscriptionWhenNotStaking, "MINIMUM_SUBSCRIPTION_REQUIRED");

        address sender = msg.sender;
        if (tokenAmount > 0) {
            playToken.transferFrom(sender, address(this), tokenAmount);
        }
        playToken.mint{value: msg.value}(address(this), amountToMint);
        uint256[] memory zeroPlanets = new uint256[](0);
        _recordContribution(sender, amountToMint + tokenAmount, zeroPlanets);
    }

    function subscribeViaStaking(
        uint256[] memory locations,
        uint256 amountToMint,
        uint256 tokenAmount,
        uint256 amountFromYakuza
    ) external payable {
        address sender = msg.sender;

        require(tokenAmount + amountToMint >= minimumSubscriptionWhenStaking, "MINIMUM_SUBSCRIPTION_REQUIRED");

        if (tokenAmount > 0) {
            playToken.transferFrom(sender, address(this), tokenAmount);
        }

        if (tokenAmount + amountFromYakuza > 0) {
            playToken.approve(address(outerSpace), tokenAmount + amountFromYakuza);
        }
        outerSpace.acquireMultipleViaNativeTokenAndStakingToken{value: msg.value}(
            locations,
            amountToMint,
            tokenAmount + amountFromYakuza
        );
        uint256 contribution = amountToMint + tokenAmount;
        uint256 averagePerPlanet = (amountToMint + tokenAmount + amountFromYakuza) / locations.length;
        require(averagePerPlanet >= minAverageStakePerPlanet, "PLANETS_TOO_SMALL");
        _recordContribution(sender, contribution, locations);
    }

    function _recordContribution(address subscriber, uint256 contribution, uint256[] memory planets) internal {
        _mint(subscriber, contribution);
        uint256 startTime = subscriptions[subscriber].startTime;
        uint256 endTime = subscriptions[subscriber].endTime;
        if (block.timestamp > endTime) {
            startTime = block.timestamp;
            subscriptions[subscriber].startTime = startTime;
            endTime = startTime + (numSecondsPerTokens * contribution) / 1e18;
        } else {
            endTime = endTime + (numSecondsPerTokens * contribution) / 1e18;
        }

        for (uint256 i = 0; i < planets.length; i++) {
            myPlanets[planets[i]].mine = true;
        }

        subscriptions[subscriber].endTime = endTime;
        emit YakuzaSubscribed(subscriber, startTime, endTime, contribution, planets);
    }

    // --------------------------------------------------------------------------------------------
    // Attack any planet that were belonging to Yakuza or were the target of a claim
    // --------------------------------------------------------------------------------------------
    function takeItBack(
        uint256 from,
        uint256 to,
        uint256 distance,
        uint32 amount,
        bytes32 toHash,
        bytes32 secret,
        address payable payee
    ) external payable {
        if (msg.value > 0) {
            require(payee != address(0), "NO_PAYEE");
            payee.transfer(msg.value);
        }
        address sender = msg.sender;

        // this fleet is visible to anyone
        bytes32 expectedToHash = keccak256(abi.encodePacked(secret, to, false, address(0), uint256(0)));

        require(expectedToHash == toHash, "INVALID_TO_HASH");

        // you have to be subscribed
        require(block.timestamp < subscriptions[sender].endTime, "SUBSCRIPTION_EXPIRED");

        _attack(sender, from, to, distance, amount, toHash, secret);
    }

    function _attack(
        address sender,
        uint256 from,
        uint256 to,
        uint256 distance,
        uint32 amount,
        bytes32 toHash,
        bytes32 secret
    ) internal {
        require(myPlanets[to].mine, "TARGET_PLANET_NOT_YAKUZA");
        require(myPlanets[to].lockTime < block.timestamp, "TARGET_PLANET_LOCKED");

        uint40 lastAttackTime = _updatePlanet(from, to, distance, amount);

        // then we do a basic send
        outerSpace.send(from, amount, toHash);

        uint256 fleetSentId = uint256(keccak256(abi.encodePacked(toHash, from, address(this), address(this))));
        emit YakuzaAttack(sender, to, fleetSentId, amount, lastAttackTime, secret);
    }

    function _updatePlanet(
        uint256 from,
        uint256 to,
        uint256 distance,
        uint32 amount
    ) internal returns (uint40 lastAttackTime) {
        Stats memory statsForFromPlanet = _getStats(from);
        Stats memory statsForToPlanet = _getStats(to);

        ImportingOuterSpaceTypes.ExternalPlanet memory toPlanet = outerSpace.getUpdatedPlanetState(to);
        require(toPlanet.active, "TARGET_PLANET_NOT_ACTIVE");
        require(toPlanet.owner != address(this), "TARGET_PLANET_ALREADY_OWNED");

        // player provide the distance, we need to check it
        _requireCorrectDistance(distance, from, to, statsForFromPlanet, statsForToPlanet);

        uint256 timeItTakes = ((distance * (_timePerDistance * 10000)) / statsForFromPlanet.speed);
        require(timeItTakes <= maxTimeRange, "TOO_FAR_AWAY");

        ImportingOuterSpaceTypes.ExternalPlanet memory fromPlanet = outerSpace.getUpdatedPlanetState(from);

        uint256 fromCap = _capWhenActive(statsForFromPlanet.production);
        uint256 minimumSpaceshipsToLeave = (fromCap * spaceshipsToKeepPer10000) / 10000;

        // There is a minimum number of spaceships Yakuza want to keep on each planet
        require(fromPlanet.numSpaceships > minimumSpaceshipsToLeave, "NOT_ENOUGH_SPACESHIPS");
        require(amount <= fromPlanet.numSpaceships - minimumSpaceshipsToLeave, "NEED_TO_LEAVE_ENOUGH_DEFENSE");

        lastAttackTime = _handleAttackCap(to, statsForToPlanet, amount);
    }

    function _handleAttackCap(
        uint256 to,
        Stats memory statsForToPlanet,
        uint32 amount
    ) internal returns (uint40 lastAttackTime) {
        uint256 timestamp = block.timestamp;

        uint256 toCap = _capWhenActive(statsForToPlanet.production);
        uint256 rate = (uint256(statsForToPlanet.production) * uint256(_productionSpeedUp)) / 1 hours;
        if (rate == 0) {
            rate = 1;
        }
        uint256 maxTime = toCap / rate;

        uint256 timeSinceLastAttack = timestamp - myPlanets[to].lastAttackTime;
        if (timeSinceLastAttack > maxTime) {
            timeSinceLastAttack = maxTime;
        }

        uint256 amountSpentPerSecond = amount / (timeSinceLastAttack + 1); // Add 1 to avoid division by zero

        require(amountSpentPerSecond <= rate, "TOO_MUCH_SPENT_PER_SECOND");
        require(amount >= minAttackAmount, "ATTACK_AMOUNT_TOO_SMALL");

        // Calculate the effective time passed based on the amount spent

        uint256 maxBudget = rate * timeSinceLastAttack;
        if (amount < maxBudget) {
            lastAttackTime = uint40(timestamp - timeSinceLastAttack + (amount / rate));
        } else {
            lastAttackTime = uint40(timestamp);
        }

        // Update the values after the checks
        myPlanets[to].lastAttackTime = uint40(lastAttackTime);
    }

    // --------------------------------------------------------------------------------------------
    // Claim attack by providing the details of the fleet that captured your planet
    // --------------------------------------------------------------------------------------------

    function claimCounterAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        bytes32 toHash,
        uint256 distance,
        bytes32 secret,
        address payable payee
    ) external payable {
        if (msg.value > 0) {
            require(payee != address(0), "NO_PAYEE");
            payee.transfer(msg.value);
        }
        address sender = msg.sender;

        // we enforce sending back, which make such fleet visible to anyone
        bytes32 expectedToHash = keccak256(abi.encodePacked(secret, resolution.to, false, address(0), uint256(0)));

        require(expectedToHash == toHash, "INVALID_TO_HASH");

        // you have to be subscribed
        require(block.timestamp < subscriptions[sender].endTime, "SUBSCRIPTION_EXPIRED");

        _claimAttack(fleetId, resolution, amount, from, toHash, secret, distance);
    }

    struct Result {
        uint40 arrivalTime;
        uint256 amountLeft;
        bool firstClaim;
    }

    function _computeArrivalTimeAndAmountLeft(
        uint256 fleetId,
        uint256 from,
        uint256 to,
        uint256 distance,
        uint32 amount
    ) internal view returns (Result memory result) {
        Stats memory statsForFromPlanet = _getStats(from);
        Stats memory statsForToPlanet = _getStats(to);

        // player provide the distance, we need to check it
        _requireCorrectDistance(distance, from, to, statsForFromPlanet, statsForToPlanet);

        uint256 timeItTakes = ((distance * (_timePerDistance * 10000)) / statsForFromPlanet.speed);
        require(timeItTakes <= maxTimeRange, "TOO_FAR_AWAY");
        // we compute the minimum arrival time
        result.arrivalTime = uint40(block.timestamp + timeItTakes);

        ImportingOuterSpaceTypes.ExternalPlanet memory fromPlanet = outerSpace.getUpdatedPlanetState(from);
        uint256 yakuzaCap = _capWhenActive(statsForFromPlanet.production);
        uint256 minimumSpaceshipsToLeave = (yakuzaCap * spaceshipsToKeepPer10000) / 10000;

        // There is a minimum number of spaceships Yakuza want to keep on each planet
        require(fromPlanet.numSpaceships > minimumSpaceshipsToLeave, "NOT_ENOUGH_SPACESHIPS");
        require(amount <= fromPlanet.numSpaceships - minimumSpaceshipsToLeave, "NEED_TO_LEAVE_ENOUGH_DEFENSE");

        // we give you revenge enough to capture it back
        result.amountLeft = claims[fleetId].amountLeft;
        if (result.amountLeft == 0) {
            result.firstClaim = true;
            uint256 attackedPlanetCap = _capWhenActive(statsForToPlanet.production);

            // TODO
            //      uint256 attackFactor = numAttack *
            //     ((1000000 - _fleetSizeFactor6) + ((_fleetSizeFactor6 * numAttack) / numDefense));
            // uint256 attackDamage = (attackFactor * attack) / defense / 1000000;

            result.amountLeft = statsForToPlanet.defense < statsForFromPlanet.attack
                ? attackedPlanetCap
                : ((attackedPlanetCap * statsForToPlanet.defense) / statsForFromPlanet.attack) + 1;
        }
        require(amount <= result.amountLeft, "TOO_MANY_SPACESHIPS_CLAIMED");
    }

    function _checkValidFleet(address sender, uint256 fleetId, uint256 fleetOrigin, bool firstClaim) internal view {
        // You cannot claim the same winning fleet twice
        require(!claims[fleetId].claimed, "ALREADY_CLAIMED");

        ImportingOuterSpaceTypes.ExternalPlanet memory toPlanet = outerSpace.getUpdatedPlanetState(fleetOrigin);
        require(toPlanet.active, "TARGET_PLANET_NOT_ACTIVE");
        require(toPlanet.owner != address(this), "TARGET_PLANET_ALREADY_OWNED");

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, fleetOrigin);

        require(fleet.owner != address(this), "FLEET_IS_YAKUZA");

        if (firstClaim) {
            require(fleet.defender == sender, "DID_NOT_TARGETED_YOU");
        }
        // else
        // once first claim is made, any subscriber can not continue the claim

        // Fleet arrived before you subscribe (minus _frontrunningDelay)
        require(fleet.arrivalTime - _frontrunningDelay > subscriptions[sender].startTime, "FLEET_NOT_COVERED");

        // There is a delay after which you cannot claim anymore
        if (firstClaim) {
            require(block.timestamp < fleet.arrivalTime + maxClaimDelay, "TOO_LATE_TO_CLAIM");
        } else {
            // once first claim is made, there are more time to complete it
            // allowing others to continue the counter-attack
            // this prevent player to use yakuza to partially attack their planets
            // with the intent to exit in time
            require(
                block.timestamp < fleet.arrivalTime + maxClaimDelay + maxClaimDelay / 2,
                "TOO_LATE_TO_CLAIM_FURTHER"
            );
        }

        // the fleet need to exist
        require(fleet.quantity > 0, "NO_FLEET");

        // Revenge can only be made on actual cpature of active planets
        require(fleet.planetActive && fleet.victory, "NOT_ACTIVE_VICTORY");
    }

    function _claimAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        bytes32 toHash,
        bytes32 secret,
        uint256 distance
    ) internal {
        address sender = msg.sender;

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

        Result memory planetResult = _computeArrivalTimeAndAmountLeft(fleetId, from, resolution.to, distance, amount);

        _checkValidFleet(sender, fleetId, resolution.from, planetResult.firstClaim);

        require(amount >= minAttackAmount, "ATTACK_AMOUNT_TOO_SMALL");

        // once a attacked planet is claimed, it is considered being owned by Yakuza
        myPlanets[resolution.to].mine = true;
        uint40 lockTime = myPlanets[resolution.to].lockTime;
        if (claims[fleetId].amountLeft == 0) {
            lockTime = planetResult.arrivalTime + uint40(_frontrunningDelay);
        } else {
            lockTime = planetResult.arrivalTime + uint40(_frontrunningDelay) < lockTime
                ? planetResult.arrivalTime + uint40(_frontrunningDelay)
                : lockTime;
        }
        myPlanets[resolution.to].lockTime = lockTime;

        if (amount >= planetResult.amountLeft) {
            planetResult.amountLeft = 0;
            claims[fleetId].claimed = true;
        } else {
            planetResult.amountLeft = uint248(planetResult.amountLeft - amount);
        }
        claims[fleetId].amountLeft = uint248(planetResult.amountLeft);

        // then we do a basic send
        // Yakuza is going to take control of the planet
        // This also ensure this cannot be abused by losing planet in purpose
        outerSpace.send(from, amount, toHash);

        uint256 fleetSentId = uint256(keccak256(abi.encodePacked(toHash, from, address(this), address(this))));
        emit YakuzaClaimed(
            sender,
            fleetId,
            resolution.to,
            fleetSentId,
            amount,
            planetResult.amountLeft,
            lockTime,
            secret
        );
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

    struct Stats {
        uint16 production;
        uint16 attack;
        uint16 defense;
        uint16 speed;
        int8 subX;
        int8 subY;
    }

    function _getStats(uint256 location) internal view returns (Stats memory stats) {
        bytes32 data = _planetData(location);
        stats.production = _production(data);
        stats.attack = _attack(data);
        stats.defense = _defense(data);
        stats.speed = _speed(data);
        (stats.subX, stats.subY) = _subLocation(data);
    }

    function _planetData(uint256 location) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_genesis, location));
    }

    function _exists(bytes32 data) internal pure returns (bool) {
        return data.value8Mod(52, 16) == 1;
    }

    function _production(bytes32 data) internal pure returns (uint16) {
        return data.normal16(12, 0x0708083409600a8c0bb80ce40e100e100e100e101068151819c81e7823282ee0); // per hour
    }

    function _attack(bytes32 data) internal pure returns (uint16) {
        return 4000 + data.normal8(20) * 400; // 4,000 - 7,000 - 10,000
    }

    function _defense(bytes32 data) internal pure returns (uint16) {
        return 4000 + data.normal8(28) * 400; // 4,000 - 7,000 - 10,000
    }

    function _subLocation(bytes32 data) internal pure returns (int8 subX, int8 subY) {
        subX = 1 - int8(data.value8Mod(0, 3));
        subY = 1 - int8(data.value8Mod(2, 3));
    }

    function _speed(bytes32 data) internal pure returns (uint16) {
        return 5005 + data.normal8(36) * 333; // 5,005 - 7,502.5 - 10,000
    }

    function _requireCorrectDistance(
        uint256 distance,
        uint256 from,
        uint256 to,
        Stats memory fromStats,
        Stats memory toStats
    ) internal pure {
        uint256 distanceSquared = uint256(
            int256( // check input instead of compute sqrt
                ((int128(int256(to & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) * 4 + toStats.subX) -
                    (int128(int256(from & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) * 4 + fromStats.subX)) **
                    2 +
                    ((int128(int256(to >> 128)) * 4 + toStats.subY) -
                        (int128(int256(from >> 128)) * 4 + fromStats.subY)) **
                        2
            )
        );
        require(distance ** 2 <= distanceSquared && distanceSquared < (distance + 1) ** 2, "wrong distance");
    }
}
