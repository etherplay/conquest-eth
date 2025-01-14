// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpaceFleetsCommit.sol";

contract OuterSpaceFleetsCommitFacet is OuterSpaceFacetBase, IOuterSpaceFleetsCommit {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function sendWithPayee(uint256 from, uint32 quantity, bytes32 toHash, address payable payee) external payable {
        if (msg.value > 0) {
            require(payee != address(0), "NO_PAYEE");
            payee.transfer(msg.value);
        }

        send(from, quantity, toHash);
    }

    function send(uint256 from, uint32 quantity, bytes32 toHash) public {
        address sender = _msgSender();
        uint256 fleetId = uint256(keccak256(abi.encodePacked(toHash, from, sender, sender)));
        _unsafe_sendFor(
            fleetId,
            sender,
            FleetLaunch({fleetSender: sender, fleetOwner: sender, from: from, quantity: quantity, toHash: toHash})
        );
    }

    function sendForWithPayee(FleetLaunch calldata launch, address payable payee) external payable {
        if (msg.value > 0) {
            require(payee != address(0), "NO_PAYEE");
            payee.transfer(msg.value);
        }

        sendFor(launch);
    }

    function sendForMultipleWithPayee(FleetLaunch[] calldata launches, address payable payee) external payable {
        if (msg.value > 0) {
            require(payee != address(0), "NO_PAYEE");
            payee.transfer(msg.value);
        }

        for (uint256 i = 0; i < launches.length; i++) {
            sendFor(launches[i]);
        }
    }

    function sendFor(FleetLaunch calldata launch) public {
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
}
