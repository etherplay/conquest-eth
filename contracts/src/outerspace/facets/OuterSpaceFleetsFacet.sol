// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpaceFleets.sol";

contract OuterSpaceFleetsFacet is OuterSpaceFacetBase, IOuterSpaceFleets {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    // ---------------------------------------------------------------------------------------------------------------
    // FLEET RESOLUTION, ATTACK / REINFORCEMENT
    // ---------------------------------------------------------------------------------------------------------------

    function resolveFleet(uint256 fleetId, FleetResolution calldata resolution) external {
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
        _resolveFleet(fleetId, resolution);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // FLEET SENDING
    // ---------------------------------------------------------------------------------------------------------------

    function send(
        uint256 from,
        uint32 quantity,
        bytes32 toHash
    ) external {
        address sender = _msgSender();
        uint256 fleetId = uint256(keccak256(abi.encodePacked(toHash, from, sender, sender)));
        _unsafe_sendFor(
            fleetId,
            sender,
            FleetLaunch({fleetSender: sender, fleetOwner: sender, from: from, quantity: quantity, toHash: toHash})
        );
    }

    function sendFor(FleetLaunch calldata launch) external {
        //  bytes calldata fleetSignature // TODO for fleetOwner's signature ?

        address operator = _msgSender();
        if (operator != launch.fleetSender) {
            require(_operators[launch.fleetSender][operator], "NOT_AUTHORIZED_TO_SEND");
        }
        uint256 fleetId = uint256(
            keccak256(abi.encodePacked(launch.toHash, launch.from, launch.fleetSender, operator))
        );

        // fleetOwner is basically the one receiving the planet if the attack succeed
        // fleetSender is the one to be used for alliance resolution
        // operator is just so alliance can consider fleetSender based on the rule of that operator
        // if (launch.fleetOwner != launch.fleetSender && launch.fleetOwner != operator) {
        //     // TODO use signature from fleetOwner instead?
        //     require(_operators[launch.fleetOwner][operator], "NOT_AUTHORIZED_TO_FLEET");
        // }

        _unsafe_sendFor(fleetId, operator, launch);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // GETTERS
    // ---------------------------------------------------------------------------------------------------------------

    function getFleet(uint256 fleetId, uint256 from)
        external
        view
        returns (
            address owner,
            uint40 launchTime,
            uint32 quantity,
            uint64 flyingAtLaunch, // can be more than quantity if multiple fleet were launched around the same time from the same planet
            uint64 destroyedAtLaunch
        )
    {
        launchTime = _fleets[fleetId].launchTime;
        quantity = _fleets[fleetId].quantity;
        owner = _fleets[fleetId].owner;

        uint256 timeSlot = launchTime / (_frontrunningDelay / 2);
        destroyedAtLaunch = _inFlight[from][timeSlot].destroyed;
        flyingAtLaunch = _inFlight[from][timeSlot].flying;
    }
}
