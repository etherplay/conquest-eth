// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IOnStakeChange.sol";

interface ImportingOuterSpaceTypes {
    // front running protection : _frontruunningDelay / 2 slots
    struct InFlight {
        uint32 flying;
        uint32 destroyed;
        // STORE last attack too, to compute combined attack on it ? uint128 is plainty enough
    }

    // TODO remove
    // struct Account {
    //     // TODO add more info
    //     // stake for example ? => coild it be used by staking ?
    //     // numPlanets ?
    //     // numSpaceships ? => probably too much ?
    //     uint64 totalProduction;
    //     uint64 productionDebt;
    // }

    struct Discovered {
        uint32 minX;
        uint32 maxX;
        uint32 minY;
        uint32 maxY;
    }

    // TODO split in 2 structs ? PlanetOwnership and PlanetState ?
    struct Planet {
        address owner;
        uint40 ownershipStartTime; // ~ 34865 years, should be enough :)
        uint40 exitStartTime; // ~ 34865 years, should be enough :)
        // TODO uint16 ?
        ///
        uint32 numSpaceships; // uint31 + first bit => active // TODO use bool active ?
        uint40 lastUpdated; // ~ 34865 years, should be enough :)
        int40 travelingUpkeep; // decrease per _upkeepProductionDecreaseRatePer10000th  * production
        uint32 overflow;
        // bool active; // TODO ?
        // bool exiting; // TODO ?
    }

    struct Fleet {
        address owner;
        uint40 launchTime; // ~ 34865 years, should be enough :)
        uint32 quantity; // TODO? first bit = done? to keep quantity value on-chain post resolution, actually not needed, can be given in the hash
        uint24 futureExtraProduction;
        address defender;
        uint40 arrivalTime;
        uint32 defenderLoss;
        bool planetActive;
        bool victory;
        // we got 24bit more to store if needed
        // operator ? // signer ?
    }

    struct FleetData {
        bool arrived;
        address owner;
        uint40 launchTime;
        uint32 quantity;
        uint64 flyingAtLaunch; // can be more than quantity if multiple fleet were launched around the same time from the same planet
        uint64 destroyedAtLaunch;
        address defender;
        uint40 arrivalTime;
        uint32 defenderLoss;
        bool planetActive;
        bool victory;
    }

    struct PlanetStats {
        int8 subX;
        int8 subY;
        uint32 stake;
        uint16 production;
        uint16 attack;
        uint16 defense;
        uint16 speed;
        uint16 natives;
    }

    struct ExternalPlanet {
        address owner;
        uint40 ownershipStartTime; // ~ 34865 years, should be enough :)
        uint40 exitStartTime; // ~ 34865 years, should be enough :)
        uint32 numSpaceships;
        uint32 overflow;
        uint40 lastUpdated; // ~ 34865 years, should be enough :)
        bool active;
        // bool exiting;
        uint256 reward;
    }

    struct FleetLaunch {
        address fleetSender;
        address fleetOwner;
        uint256 from;
        uint32 quantity;
        bytes32 toHash;
    }
    struct FleetResolution {
        uint256 from;
        uint256 to;
        uint256 distance;
        uint256 arrivalTimeWanted;
        bool gift;
        address specific;
        bytes32 secret;
        address fleetSender; // does not work ?
        address operator; // should be saved ?
    }

    struct AccumulatedAttack {
        address target;
        uint32 numAttackSpent;
        uint32 damageCausedSoFar;
        uint16 averageAttackPower;
    }
}
