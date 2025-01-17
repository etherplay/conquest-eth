// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "../../outerspace/interfaces/IOuterSpace.sol";
import "../../outerspace/interfaces/IApprovalForAllReceiver.sol";

contract BasicSpaceshipMarket is IApprovalForAllReceiver {
    event SpaceshipsForSale(
        uint256 indexed location,
        address indexed owner,
        uint256 pricePerUnit,
        uint256 spaceshipsToKeep,
        uint256 spaceshipsToSell
    );
    event SaleCancelled(uint256 indexed location, address indexed owner);

    event SpaceshipsSold(uint256 indexed location, address indexed fleetOwner, uint256 numSpaceships);

    struct SpaceshipSale {
        uint144 pricePerUnit;
        uint256 spaceshipsToKeep;
        uint40 spaceshipsLeftToSell;
        uint40 timestamp;
    }

    mapping(uint256 => SpaceshipSale) internal _sales;

    IOuterSpace internal immutable _outerspace;

    constructor(IOuterSpace outerspace) {
        _outerspace = outerspace;
    }

    ///@dev useful to get data without any off-chain caching, but does not scale to many locations
    function getSales(uint256[] calldata locations) external view returns (SpaceshipSale[] memory sales) {
        sales = new SpaceshipSale[](locations.length);
        for (uint256 i = 0; i < locations.length; i++) {
            sales[i] = _sales[locations[i]];
        }
    }

    function onApprovalForAllBy(address owner, bytes calldata data) external {
        require(msg.sender == address(_outerspace), "APPROVEDBY_EXPECTS_OUTERSPACE");
        (uint256 location, uint144 pricePerUnit, uint32 spaceshipsToKeep, uint40 spaceshipsToSell) = abi.decode(
            data,
            (uint256, uint144, uint32, uint40)
        );
        _setSpaceshipsForSale(owner, location, pricePerUnit, spaceshipsToKeep, spaceshipsToSell);
    }

    function setSpaceshipsForSale(
        uint256 location,
        uint144 pricePerUnit,
        uint32 spaceshipsToKeep,
        uint40 spaceshipsToSell
    ) external {
        _setSpaceshipsForSale(msg.sender, location, pricePerUnit, spaceshipsToKeep, spaceshipsToSell);
    }

    function cancelSale(uint256 location) external {
        address currentOwner = _outerspace.ownerOf(location);
        require(currentOwner == msg.sender, "NOT_PLANET_OWNER");
        _sales[location].pricePerUnit = 0;
        _sales[location].spaceshipsToKeep = 0;
        _sales[location].spaceshipsLeftToSell = 0;
        _sales[location].timestamp = 0;

        emit SaleCancelled(location, currentOwner);
    }

    function purchase(
        uint256 location,
        uint32 numSpaceships,
        address payable fleetSender,
        bytes32 toHash
    ) external payable {
        SpaceshipSale memory sale = _sales[location];
        (, uint40 ownershipStartTime) = _outerspace.ownerAndOwnershipStartTimeOf(location);

        require(sale.timestamp > ownershipStartTime, "OWNERSHIP_CHANGED_SALE_OUTDATED");

        // TODO use a min-max and avoid revert this way ?
        require(sale.spaceshipsLeftToSell >= numSpaceships, "NOT_ENOUGH_ON_SALE");

        // TODO special case for 0xFFFFF to indicate I want to sell for ever
        // if (sale.spaceshipsLeftToSell != 2**40-1) {
        sale.spaceshipsLeftToSell -= numSpaceships;
        // }

        uint256 toPay = numSpaceships * sale.pricePerUnit;
        require(msg.value >= toPay, "NOT_ENOUGH_FUND");
        fleetSender.transfer(toPay);
        if (msg.value > toPay) {
            payable(msg.sender).transfer(msg.value - toPay);
        }

        IOuterSpace.FleetLaunch memory launch;
        launch.fleetSender = fleetSender; // this is checked by outerspace
        launch.fleetOwner = msg.sender;
        launch.from = location;
        launch.quantity = numSpaceships;
        launch.toHash = toHash;
        _outerspace.sendFor(launch);

        if (sale.spaceshipsToKeep > 0) {
            // we can call getPlanetState as the plane state has been updated above
            IOuterSpace.ExternalPlanet memory planetUpdated = _outerspace.getPlanetState(location);

            // TODO could update OuterSpace.sendFor function to actually specify the amount left, and then pay for that amount if smaller that what wanted
            require(planetUpdated.numSpaceships >= sale.spaceshipsToKeep, "TOO_MANY_SPACESHIPS_BOUGHT");
        }

        emit SpaceshipsSold(location, msg.sender, numSpaceships);
    }

    // ----------------------------------------
    // INTERNAL
    // ----------------------------------------

    function _setSpaceshipsForSale(
        address seller,
        uint256 location,
        uint144 pricePerUnit,
        uint32 spaceshipsToKeep,
        uint40 spaceshipsToSell
    ) internal {
        address currentOwner = _outerspace.ownerOf(location);
        require(currentOwner == seller, "NOT_PLANET_OWNER");
        _sales[location].pricePerUnit = pricePerUnit;
        _sales[location].spaceshipsToKeep = spaceshipsToKeep;
        _sales[location].spaceshipsLeftToSell = spaceshipsToSell;
        _sales[location].timestamp = uint40(block.timestamp);

        emit SpaceshipsForSale(location, currentOwner, pricePerUnit, spaceshipsToKeep, spaceshipsToSell);
    }
}
