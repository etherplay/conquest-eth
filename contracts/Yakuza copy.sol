// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../conquest_token/RewardsGenerator.sol";
import "../conquest_token/PlayToken.sol";
import "../outerspace/interfaces/IOuterSpace.sol";
import "../outerspace/types/ImportingOuterSpaceTypes.sol";
import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";
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
        uint256 numSecondsPerTokens;
        uint256 spaceshipsToKeepPer10000;
        uint256 acquireNumSpaceships;
        uint256 productionCapAsDuration;
        uint256 frontrunningDelay;
        uint256 minAverageStakePerPlanet;
        uint256 maxClaimDelay;
        uint256 minimumSubscriptionWhenStaking;
        uint256 minimumSubscriptionWhenNotStaking;
        uint256 maxAmountSpentPerSecondForAttacks;
        uint256 attackMaxDistance;
        bytes32 genesis;
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
        uint256 amountLeft
    );

    event YakuzaAttack(
        address indexed sender,
        uint256 indexed to,
        uint256 fleetSentId,
        uint256 amountSent,
        uint256 timestamp,
        uint256 amountSpentOverTime
    );

    event RewardReceiverSet(address newRewardReceiver);
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // IMMUTABLES
    // --------------------------------------------------------------------------------------------
    IOuterSpace public immutable outerSpace;
    PlayToken public immutable playToken;

    bytes32 internal immutable _genesis;
    uint256 internal immutable _acquireNumSpaceships;
    uint256 internal immutable _productionCapAsDuration;
    uint256 internal immutable _frontrunningDelay;

    uint256 public immutable numSecondsPerTokens;
    uint256 public immutable spaceshipsToKeepPer10000;
    uint256 public immutable minAverageStakePerPlanet;
    uint256 public immutable maxClaimDelay;
    uint256 public immutable minimumSubscriptionWhenStaking;
    uint256 public immutable minimumSubscriptionWhenNotStaking;
    uint256 public immutable maxAmountSpentPerSecondForAttacks;
    uint256 public immutable attackMaxDistance;
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // STATE VARIABLES
    // --------------------------------------------------------------------------------------------
    address public rewardReceiver;
    RewardsGenerator public generator;

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
        uint208 amountSpentOverTime;
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

        numSecondsPerTokens = config.numSecondsPerTokens;
        spaceshipsToKeepPer10000 = config.spaceshipsToKeepPer10000;
        maxClaimDelay = config.maxClaimDelay;
        minAverageStakePerPlanet = config.minAverageStakePerPlanet;
        minimumSubscriptionWhenStaking = config.minimumSubscriptionWhenStaking;
        minimumSubscriptionWhenNotStaking = config.minimumSubscriptionWhenNotStaking;
        maxAmountSpentPerSecondForAttacks = config.maxAmountSpentPerSecondForAttacks;
        attackMaxDistance = config.attackMaxDistance;

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
        uint256[] memory planets = new uint256[](0);
        _recordContribution(sender, amountToMint + tokenAmount, planets);
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
    function attack(
        uint256 from,
        uint256 to,
        uint256 distance,
        uint32 amount,
        bytes32 toHash,
        bytes32 secret,
        address payable payee
    ) external payable {
        address sender = msg.sender;
        _checkValidityAndHandlePayee(sender, secret, to, toHash, payee);

        Stats memory statsForFromPlanet = _getStats(from);
        Stats memory statsForToPlanet = _getStats(to);

        // ----------------------------------------------------------------------------------------
        // SPECIFIC
        // ----------------------------------------------------------------------------------------
        MyPlanet storage myPlanet = myPlanets[to];
        require(myPlanet.mine, "TARGET_PLANET_NOT_YAKUZA");

        ImportingOuterSpaceTypes.ExternalPlanet memory toPlanet = outerSpace.getUpdatedPlanetState(to);
        require(toPlanet.active, "TARGET_PLANET_NOT_ACTIVE");
        require(toPlanet.owner != address(this), "TARGET_PLANET_ALREADY_OWNED");

        uint256 distanceSquared = uint256(
            int256( // check input instead of compute sqrt
                ((int128(int256(to & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) * 4 + statsForToPlanet.subX) -
                    (int128(int256(from & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) * 4 + statsForFromPlanet.subX)) **
                    2 +
                    ((int128(int256(to >> 128)) * 4 + statsForToPlanet.subY) -
                        (int128(int256(from >> 128)) * 4 + statsForFromPlanet.subY)) **
                        2
            )
        );
        require(distance ** 2 <= distanceSquared && distanceSquared < (distance + 1) ** 2, "wrong distance");

        require(distance <= attackMaxDistance, "TARGET_PLANET_TOO_FAR_AWAY");

        // ----------------------------------------------------------------------------------------
        // COMMON
        // ----------------------------------------------------------------------------------------

        // ----------------------------------------------------------------------------------------

        // then we do a basic send
        // Yakuza is going to take control of the planet
        // This also ensure this cannot be abused by losing planet in purpose
        _sendAttack();
    }

    function _sendAttack(addresss sender, MyPlanet storage myPlanet, uint32 amount) internal {
        (uint208 amountSpentOverTime, uint40 lastAttackTime) = _handleAttackRate(myPlanet, amount);
        emit YakuzaAttack(sender, to, _sendFleet(from, amount, toHash), amount, lastAttackTime, amountSpentOverTime);
    }

    function _handleAttackRate(
        MyPlanet storage myPlanet,
        uint32 amount
    ) internal returns (uint208 amountSpentOverTime, uint40 lastAttackTime) {
        uint256 timestamp = block.timestamp;
        uint256 amountSpentOverTime = myPlanet.amountSpentOverTime;
        uint256 timeSinceLastAttack = timestamp - myPlanet.lastAttackTime;

        // this is used by claimCounterAttack to block attack while traveling
        require(block.timestamp >= myPlanet.lastAttackTime, "TOO_SOON");

        // Apply linear decay
        uint256 decayRate = 1;
        uint256 minAttackAmount = 50000;
        uint256 decayAmount = timeSinceLastAttack * decayRate;

        if (decayAmount > amountSpentOverTime) {
            amountSpentOverTime = 0;
        } else {
            amountSpentOverTime -= decayAmount;
        }

        uint256 amountSpent = amountSpentOverTime + amount;
        uint256 amountSpentPerSecond = amountSpent / (timeSinceLastAttack + 1); // Add 1 to avoid division by zero

        require(amountSpentPerSecond <= maxAmountSpentPerSecondForAttacks, "TOO_MUCH_SPENT_PER_SECOND");
        require(amount >= minAttackAmount, "ATTACK_AMOUNT_TOO_SMALL");

        // Update the values after the checks
        myPlanet.amountSpentOverTime = uint208(amountSpent);
        myPlanet.lastAttackTime = uint40(timestamp);
    }

    function _sendFleet(uint256 from, uint32 amount, bytes32 toHash) internal returns (uint256 fleetId) {
        outerSpace.send(from, amount, toHash);
        return uint256(keccak256(abi.encodePacked(toHash, from, address(this), address(this))));
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
        bytes32 secret,
        address payable payee
    ) external payable {
        _checkValidityAndHandlePayee(msg.sender, secret, resolution.to, toHash, payee);
        _claimAttack(fleetId, resolution, amount, from, toHash);
    }

    function _checkAmount(Stats memory statsForFromPlanet, uint256 from, uint256 amount) internal {
        ImportingOuterSpaceTypes.ExternalPlanet memory fromPlanet = outerSpace.getUpdatedPlanetState(from);

        uint256 fromCap = _capWhenActive(statsForFromPlanet.production);
        uint256 minimumSpaceshipsToLeave = (fromCap * spaceshipsToKeepPer10000) / 10000;

        // There is a minimum number of spaceships Yakuza want to keep on each planet
        require(fromPlanet.numSpaceships > minimumSpaceshipsToLeave, "NOT_ENOUGH_SPACESHIPS");
        require(amount <= fromPlanet.numSpaceships - minimumSpaceshipsToLeave, "NEED_TO_LEAVE_ENOUGH_DEFENSE");
    }

    function _checkValidityAndHandlePayee(
        address sender,
        bytes32 secret,
        uint256 to,
        bytes32 toHash,
        address payable payee
    ) internal {
        // you have to be subscribed
        require(block.timestamp < subscriptions[sender].endTime, "SUBSCRIPTION_EXPIRED");

        if (msg.value > 0) {
            require(payee != address(0), "NO_PAYEE");
            payee.transfer(msg.value);
        }

        // we enforce sending back, which make such fleet visible to anyone
        bytes32 expectedToHash = keccak256(abi.encodePacked(secret, to, false, address(0), uint256(0)));

        require(expectedToHash == toHash, "INVALID_TO_HASH");
    }

    function _claimAttack(
        uint256 fleetId,
        ImportingOuterSpaceTypes.FleetResolution calldata resolution,
        uint32 amount,
        uint256 from,
        bytes32 toHash
    ) internal {
        address sender = msg.sender;
        // You cannot claim the same winning fleet twice
        require(!claims[fleetId].claimed, "ALREADY_CLAIMED");

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, resolution.from);

        require(fleet.owner != address(this), "FLEET_IS_YAKUZA");
        require(fleet.defender == sender || fleet.defender == address(this), "DID_NOT_TARGETED_YOU_NOR_YAKUZA");

        // Fleet arrived before you subscribe (minus _frontrunningDelay)
        require(fleet.arrivalTime - _frontrunningDelay > subscriptions[sender].startTime, "FLEET_NOT_COVERED");

        // There is a delay after which you cannot claim anymore
        require(block.timestamp < fleet.arrivalTime + maxClaimDelay, "TOO_LATE_TO_CLAIM");

        // the fleet need to exist
        require(fleet.quantity > 0, "NO_FLEET");

        ImportingOuterSpaceTypes.ExternalPlanet memory yakuzaPlanet = outerSpace.getUpdatedPlanetState(from);
        Stats memory statsForYakuzaPlanet = _getStats(from);
        uint256 yakuzaCap = _capWhenActive(statsForYakuzaPlanet.production);
        uint256 minimumSpaceshipsToLeave = (yakuzaCap * spaceshipsToKeepPer10000) / 10000;

        // There is a minimum number of spaceships Yakuza want to keep on each planet
        require(yakuzaPlanet.numSpaceships > minimumSpaceshipsToLeave, "NOT_ENOUGH_SPACESHIPS");
        require(amount <= yakuzaPlanet.numSpaceships - minimumSpaceshipsToLeave, "NEED_TO_LEAVE_ENOUGH_DEFENSE");

        // Revenge can only be made on actual cpature of active planets
        require(fleet.planetActive && fleet.victory, "NOT_ACTIVE_VICTORY");

        // we give you revenge enough to capture it back
        uint256 amountLeft = claims[fleetId].amountLeft;
        if (amountLeft == 0) {
            // TODO optimize re-calculate here with genesisHash
            Stats memory statsForAttackedPlanet = _getStats(resolution.to);
            uint256 attackedPlanetCap = _capWhenActive(statsForAttackedPlanet.production);
            amountLeft = ((attackedPlanetCap * statsForAttackedPlanet.defense) / statsForYakuzaPlanet.attack) + 1;
        }
        require(amount <= amountLeft, "TOO_MANY_SPACESHIPS_CLAIMED");

        if (amount >= amountLeft) {
            amountLeft = 0;
            claims[fleetId].claimed = true;
        } else {
            amountLeft = uint248(amountLeft - amount);
        }
        claims[fleetId].amountLeft = uint248(amountLeft);

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

        // once a attacked planet is claim, it is considered being owned by Yakuza
        // TODO
        uint40 arrivalTime = 0;
        myPlanets[resolution.to].mine = true;
        uint40 lastAttackTime = myPlanets[resolution.to].lastAttackTime;
        myPlanets[resolution.to].lastAttackTime = arrivalTime < lastAttackTime ? arrivalTime : lastAttackTime;

        // then we do a basic send
        // Yakuza is going to take control of the planet
        // This also ensure this cannot be abused by losing planet in purpose

        emit YakuzaClaimed(sender, fleetId, resolution.to, _sendFleet(from, amount, toHash), amount, amountLeft);
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

    struct Stats {
        uint16 production;
        uint16 attack;
        uint16 defense;
        int8 subX;
        int8 subY;
    }

    function _getStats(uint256 location) internal view returns (Stats memory stats) {
        bytes32 data = _planetData(location);
        stats.production = _production(data);
        stats.attack = _attack(data);
        stats.defense = _defense(data);
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
}
