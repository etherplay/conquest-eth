// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";
import "../interfaces/IOuterSpacePlanets.sol";
import "../interfaces/IApprovalForAllReceiver.sol";
import "../../libraries/StringUtils.sol";

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenID,
        bytes calldata data
    ) external returns (bytes4);
}

contract OuterSpacePlanetsFacet is OuterSpaceFacetBase, IOuterSpacePlanets {
    // solhint-disable-next-line no-empty-blocks
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    function setApprovalForAll(address operator, bool approved) external {
        address sender = _msgSender();
        _operators[sender][operator] = approved;
        emit ApprovalForAll(sender, operator, approved);
    }

    function setApprovalForAllIfNeededAndCall(
        IApprovalForAllReceiver operator,
        bytes calldata data
    ) external {
        address sender = _msgSender();
        if (!_operators[sender][address(operator)]) {
            _operators[sender][address(operator)] = true;
            emit ApprovalForAll(sender, address(operator), true);
        }
        operator.onApprovalForAllBy(sender, data);
    }

    function ownerOf(
        uint256 location
    ) external view returns (address currentOwner) {
        Planet storage planet = _getPlanet(location);
        currentOwner = planet.owner;
        // We could have done the following but to keep the state and event in sync, we don't
        // if (_hasJustExited(_planets[location].exitStartTime)) {
        //     currentOwner = address(0);
        // } else {
        //     PlanetUpdateState memory planetUpdate = _createPlanetUpdateState(planet, location);
        //     _computePlanetUpdateForTimeElapsed(planetUpdate);
        //     if (!planetUpdate.active && planetUpdate.numSpaceships == 0) {
        //         currentOwner = address(0);
        //     }
        // }
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool) {
        return _operators[owner][operator];
    }

    function name() external pure returns (string memory _name) {
        _name = "Conquest V0 Planets";
    }

    function symbol() external pure returns (string memory _symbol) {
        _symbol = "PLANETV0";
    }

    function _attributes(
        uint256 location
    ) internal view returns (bytes memory) {
        bytes32 data = _planetData(location);

        uint256 decimal = _stake(data);
        uint256 integer = decimal / 10000;
        decimal -= integer * 10000;

        return
            bytes.concat(
                "<text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='156'%2520xml:space='preserve'%2520y='300'>",
                StringUtils.toString(_production(data)),
                "</text><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='356'%2520xml:space='preserve'%2520y='300'>",
                StringUtils.toString(_speed(data)),
                "</text><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='156'%2520xml:space='preserve'%2520y='350'>",
                StringUtils.toString(_attack(data)),
                "</text><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='356'%2520xml:space='preserve'%2520y='350'>",
                StringUtils.toString(_defense(data)),
                "</text><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='256'%2520xml:space='preserve'%2520y='400'>",
                StringUtils.toString(integer),
                ".",
                StringUtils.toString(decimal),
                "</text>"
            );
    }

    function contractURI() external pure returns (string memory) {
        return
            'data:application/json,{"name":"Conquest.eth%20v0%20Planets","description":"Planets%20Staked%20In%20Conquest.eth%20DEFCON%20Edition"}';
    }

    function tokenURI(
        uint256 _tokenId
    ) external view returns (string memory uri) {
        int256 x = int256(
            int128(int256(_tokenId & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF))
        );
        int256 y = int256(int128(int256(_tokenId >> 128)));

        bytes memory attributes = _attributes(_tokenId);
        bytes memory coords = bytes.concat(
            StringUtils.toStringSigned(x),
            ",",
            StringUtils.toStringSigned(y)
        );
        uri = string(
            bytes.concat(
                'data:application/json,{"name":"Planet%20',
                coords,
                '","description":"Planet%20at%20position%20',
                coords,
                '","image":"',
                bytes.concat(
                    "data:image/svg+xml,<svg%2520xmlns='http://www.w3.org/2000/svg'%2520viewBox='0%25200%2520512%2520512'%2520fill='%2523667788'%2520stroke='%2523667788'><circle%2520cx='256'%2520cy='256'%2520fill='%2523ffffff00'%2520r='220'%2520stroke-width='10'%2520style='fill-opacity:0'/><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='256'%2520xml:space='preserve'%2520y='120'%2520style='text-decoration:underline'>Conquest.eth</text><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='256'%2520xml:space='preserve'%2520y='186'>Planet</text><text%2520font-family='Monospace'%2520font-size='32'%2520stroke-width='0'%2520text-anchor='middle'%2520x='256'%2520xml:space='preserve'%2520y='235'>",
                    coords,
                    "</text>,",
                    attributes,
                    "</svg>"
                ),
                '"}'
            )
        );
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 location
    ) external {
        _transfer(from, to, location);
        if (to.code.length > 0) {
            require(
                _checkOnERC721Received(msg.sender, from, to, location, ""),
                "TRANSFER_REJECTED"
            );
        }
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 location,
        bytes calldata data
    ) external {
        _transfer(from, to, location);
        if (to.code.length > 0) {
            require(
                _checkOnERC721Received(msg.sender, from, to, location, data),
                "TRANSFER_REJECTED"
            );
        }
    }

    function transferFrom(address from, address to, uint256 location) external {
        _transfer(from, to, location);
    }

    function _transfer(
        address from,
        address to,
        uint256 location
    ) internal whenNotPaused {
        require(from != address(0), "NOT_ZERO_ADDRESS");
        require(to != address(0), "NOT_ZERO_ADDRESS");

        // -----------------------------------------------------------------------------------------------------------
        // Initialise State Update
        // -----------------------------------------------------------------------------------------------------------
        Planet storage planet = _getPlanet(location);
        PlanetUpdateState memory planetUpdate = _createPlanetUpdateState(
            planet,
            location
        );

        // -----------------------------------------------------------------------------------------------------------
        // Compute Basic Planet Updates
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForTimeElapsed(planetUpdate);

        // -----------------------------------------------------------------------------------------------------------
        // check requirements
        // -----------------------------------------------------------------------------------------------------------

        require(planetUpdate.newOwner == from, "FROM_NOT_OWNER");
        if (msg.sender != planetUpdate.newOwner) {
            require(
                _operators[planetUpdate.newOwner][msg.sender],
                "NOT_OPERATOR"
            );
        }

        // -----------------------------------------------------------------------------------------------------------
        // Perform Transfer
        // -----------------------------------------------------------------------------------------------------------
        planetUpdate.newOwner = to;
        // NOTE transfer incurs a tax if the new owner and previous owner are not in an alliance since at least 3 days.
        if (
            planetUpdate.numSpaceships > 0 &&
            !_isFleetOwnerTaxed(from, to, uint40(block.timestamp - 3 days))
        ) {
            planetUpdate.numSpaceships = uint32(
                uint256(planetUpdate.numSpaceships) -
                    (uint256(planetUpdate.numSpaceships) * _giftTaxPer10000) /
                        10000
            );
        }

        // -----------------------------------------------------------------------------------------------------------
        // Write New State
        // -----------------------------------------------------------------------------------------------------------
        _setPlanet(planet, planetUpdate, false);

        // -----------------------------------------------------------------------------------------------------------
        // Emit Event
        // -----------------------------------------------------------------------------------------------------------
        emit BlockTime(block.number, block.timestamp);
        emit PlanetTransfer(
            from,
            to,
            location,
            planetUpdate.numSpaceships,
            planetUpdate.travelingUpkeep,
            planetUpdate.overflow
        );

        // using planetUpdate.newExitStartTime but planetUpdate.exitStartTime would work too
        // since planetUpdate.active would be false if it expired
        if (planetUpdate.active && planetUpdate.newExitStartTime == 0) {
            // we only move if the planet is a staked planet and it is not already exiting
            _notifyGeneratorMove(
                from,
                to,
                uint256(_stake(planetUpdate.data)) * (DECIMALS_14)
            );
        }
    }

    function ownerAndOwnershipStartTimeOf(
        uint256 location
    ) external view returns (address owner, uint40 ownershipStartTime) {
        owner = _planets[location].owner;
        ownershipStartTime = _planets[location].ownershipStartTime;
    }

    // TODO update spaceship sale contract // now use ExternalPlanet
    function getPlanetState(
        uint256 location
    ) external view returns (ExternalPlanet memory state) {
        Planet storage planet = _getPlanet(location);
        (bool active, uint32 numSpaceships) = _activeNumSpaceships(
            planet.numSpaceships
        );
        state = ExternalPlanet({
            owner: planet.owner,
            ownershipStartTime: planet.ownershipStartTime,
            exitStartTime: planet.exitStartTime,
            numSpaceships: numSpaceships,
            overflow: planet.overflow,
            lastUpdated: planet.lastUpdated,
            active: active,
            reward: _rewards[location]
        });
    }

    function getUpdatedPlanetState(
        uint256 location
    ) external view returns (ExternalPlanet memory state) {
        // -----------------------------------------------------------------------------------------------------------
        // Initialise State Update
        // -----------------------------------------------------------------------------------------------------------
        Planet storage planet = _getPlanet(location);
        PlanetUpdateState memory planetUpdate = _createPlanetUpdateState(
            planet,
            location
        );

        // -----------------------------------------------------------------------------------------------------------
        // Compute Basic Planet Updates
        // -----------------------------------------------------------------------------------------------------------
        _computePlanetUpdateForTimeElapsed(planetUpdate);

        state = ExternalPlanet({
            owner: planetUpdate.newOwner,
            ownershipStartTime: planetUpdate.newOwner != planetUpdate.owner
                ? uint40(block.timestamp)
                : planet.ownershipStartTime,
            exitStartTime: planetUpdate.newExitStartTime,
            numSpaceships: planetUpdate.numSpaceships,
            overflow: planetUpdate.overflow,
            lastUpdated: uint40(block.timestamp),
            active: planetUpdate.active,
            reward: _rewards[location]
        });
        // travelingUpkeep
    }

    function getPlanet(
        uint256 location
    )
        external
        view
        returns (ExternalPlanet memory state, PlanetStats memory stats)
    {
        Planet storage planet = _getPlanet(location);
        (bool active, uint32 numSpaceships) = _activeNumSpaceships(
            planet.numSpaceships
        );
        state = ExternalPlanet({
            owner: planet.owner,
            ownershipStartTime: planet.ownershipStartTime,
            exitStartTime: planet.exitStartTime,
            numSpaceships: numSpaceships,
            overflow: planet.overflow,
            lastUpdated: planet.lastUpdated,
            active: active,
            reward: _rewards[location]
        });
        stats = _getPlanetStats(location);
    }

    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;

    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenID,
        bytes memory data
    ) internal returns (bool) {
        bytes4 retval = IERC721Receiver(to).onERC721Received(
            operator,
            from,
            tokenID,
            data
        );
        return (retval == ERC721_RECEIVED);
    }
}
