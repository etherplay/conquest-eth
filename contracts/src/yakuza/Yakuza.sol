// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "../conquest_token/RewardsGenerator.sol";
import "../outerspace/interfaces/IOuterSpace.sol";
import "../outerspace/types/ImportingOuterSpaceTypes.sol";
import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";
import "../base/erc20/UsingERC20Base.sol";
import "../base/erc20/WithPermitAndFixedDomain.sol";

interface IClaim {
    function claim(address to) external;
}

contract Yakuza is UsingERC20Base, WithPermitAndFixedDomain, Proxied {
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
    }
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------------------------------------
    event Subscribed(address indexed subscriber, uint256 startTime, uint256 endTime, uint256 contribution);
    event Claimed(
        address indexed sender,
        uint256 indexed fleetId,
        uint256 indexed attackedPlanet,
        uint256 amount,
        uint256 amountLeft
    );

    event RewardReceiverSet(address newRewardReceiver);
    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // IMMUTABLES
    // --------------------------------------------------------------------------------------------
    IOuterSpace public immutable outerSpace;

    uint256 internal immutable _acquireNumSpaceships;
    uint256 internal immutable _productionCapAsDuration;
    uint256 internal immutable _frontrunningDelay;

    uint256 public immutable numSecondsPerTokens;
    uint256 public immutable spaceshipsToKeepPer10000;
    uint256 public immutable minAverageStakePerPlanet;
    uint256 public immutable maxClaimDelay;
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

    // --------------------------------------------------------------------------------------------

    // --------------------------------------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(
        address initialRewardReceiver,
        RewardsGenerator initialGenerator,
        IOuterSpace initialOuterSpace,
        Config memory config
    ) WithPermitAndFixedDomain("1") {
        outerSpace = initialOuterSpace;

        _acquireNumSpaceships = config.acquireNumSpaceships;
        _productionCapAsDuration = config.productionCapAsDuration;
        _frontrunningDelay = config.frontrunningDelay;

        numSecondsPerTokens = config.numSecondsPerTokens;
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
        _mint(sender, contribution);
        uint256 startTime = subscriptions[sender].startTime;
        if (block.timestamp > subscriptions[sender].endTime) {
            startTime = block.timestamp;
            subscriptions[sender].startTime = startTime;
        }
        uint256 endTime = subscriptions[sender].endTime;
        endTime += (numSecondsPerTokens * contribution) / 1e18;
        subscriptions[sender].endTime = endTime;
        emit Subscribed(sender, startTime, endTime, contribution);
    }

    // --------------------------------------------------------------------------------------------
    // Claim attack by providing the details of the fleet that captured your planet
    // --------------------------------------------------------------------------------------------

    // THis would allow any attack, but this would also allow gifting and more
    // so it would easy to trigger claims and get more than you spent
    // Unless we modifiy the logic to ensure you only get what you lost in the claimed attack
    // But this in turn would reduce the utility / power of Yakuza
    // function claimAttack(
    //     uint256 fleetId,
    //     ImportingOuterSpaceTypes.FleetResolution calldata resolution,
    //     uint32 amount,
    //     uint256 from,
    //     bytes32 toHash
    // ) external {
    //     _claimAttack(fleetId, resolution, amount, from, toHash);
    // }

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
        address sender = msg.sender;
        // You cannot claim the same winning fleet twice
        require(!claims[fleetId].claimed, "ALREADY_CLAIMED");

        // you have to be subscribed
        require(block.timestamp < subscriptions[sender].endTime, "SUBSCRIPTION_EXPIRED");

        ImportingOuterSpaceTypes.FleetData memory fleet = outerSpace.getFleetData(fleetId, resolution.from);

        require(fleet.owner != address(this), "FLEET_IS_YAKUZA");
        require(fleet.defender == sender, "FLEET_DID_NOT_TARGETED_YOU");

        // Fleet arrived before you subscribe (minus _frontrunningDelay)
        require(fleet.arrivalTime - _frontrunningDelay > subscriptions[sender].startTime, "FLEET_NOT_COVERED");

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

        emit Claimed(sender, fleetId, resolution.to, amount, amountLeft);

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
