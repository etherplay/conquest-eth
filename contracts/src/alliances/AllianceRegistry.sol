// SPDX-License-Identifier: AGPL-3.0

pragma solidity 0.8.9;

import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";
import "../interfaces/IAlliance.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// import "hardhat/console.sol";

contract AllianceRegistry is Proxied {
    using ECDSA for bytes32;

    uint8 internal constant MAX_NUM_ALLIANCES = 4;

    mapping(address => mapping(IAlliance => uint256)) internal _allianceNonces;
    struct AllianceRow {
        IAlliance alliance;
        uint96 joinTime;
    }
    struct Alliances {
        AllianceRow alliance0;
        AllianceRow alliance1;
        AllianceRow alliance2;
        AllianceRow alliance3;
    }
    mapping(address => Alliances) internal _alliances;

    event AllianceLink(IAlliance indexed alliance, address indexed player, bool joining);

    function getAllianceDataAtSlot(
        address player,
        uint8 slot
    ) external view returns (IAlliance alliance, uint96 joinTime, uint256 nonce) {
        Alliances storage alliances = _alliances[player];
        if (slot == 0) {
            alliance = alliances.alliance0.alliance;
            joinTime = alliances.alliance0.joinTime;
        } else if (slot == 1) {
            alliance = alliances.alliance1.alliance;
            joinTime = alliances.alliance1.joinTime;
        } else if (slot == 2) {
            alliance = alliances.alliance2.alliance;
            joinTime = alliances.alliance2.joinTime;
        } else if (slot == 3) {
            alliance = alliances.alliance3.alliance;
            joinTime = alliances.alliance3.joinTime;
        }

        nonce = _allianceNonces[player][alliance];
    }

    function getAllianceData(address player, IAlliance alliance) public view returns (uint96 joinTime, uint256 nonce) {
        nonce = _allianceNonces[player][alliance];

        Alliances storage alliances = _alliances[player];
        if (alliances.alliance0.alliance == alliance) {
            joinTime = alliances.alliance0.joinTime;
        } else if (alliances.alliance1.alliance == alliance) {
            joinTime = alliances.alliance1.joinTime;
        } else if (alliances.alliance2.alliance == alliance) {
            joinTime = alliances.alliance2.joinTime;
        } else if (alliances.alliance3.alliance == alliance) {
            joinTime = alliances.alliance3.joinTime;
        }
    }

    function havePlayersAnAllianceInCommon(
        address player1,
        address player2,
        uint256 timestamp
    ) external view returns (IAlliance alliance, uint96 joinTime) {
        Alliances storage p1Alliances = _alliances[player1];
        Alliances storage p2Alliances = _alliances[player2];

        AllianceRow[4] memory player1Alliances;
        AllianceRow[4] memory player2Alliances;
        uint256 num1 = 0;
        uint256 num2 = 0;

        for (uint256 i = 0; i < 4; i++) {
            if (i == num1) {
                AllianceRow memory allianceRow;
                if (i == 0) {
                    allianceRow = p1Alliances.alliance0;
                } else if (i == 1) {
                    allianceRow = p1Alliances.alliance1;
                } else if (i == 2) {
                    allianceRow = p1Alliances.alliance2;
                } else if (i == 3) {
                    allianceRow = p1Alliances.alliance3;
                }
                if (address(allianceRow.alliance) == address(0)) {
                    // console.log("p1 exhausted");
                    return (alliance, joinTime); // the alliance leave ensure that there is no gap // TODO
                }
                player1Alliances[num1++] = allianceRow;
            }
            for (uint256 j = 0; j < 4; j++) {
                if (j == num2) {
                    AllianceRow memory allianceRow;
                    if (j == 0) {
                        allianceRow = p2Alliances.alliance0;
                    } else if (j == 1) {
                        allianceRow = p2Alliances.alliance1;
                    } else if (j == 2) {
                        allianceRow = p2Alliances.alliance2;
                    } else if (j == 3) {
                        allianceRow = p2Alliances.alliance3;
                    }
                    if (address(allianceRow.alliance) == address(0)) {
                        // console.log("p2 exhausted");
                        // return (alliance, joinTime); // the alliance leave ensure that there is no gap // TODO
                        break;
                    }
                    player2Alliances[num2++] = allianceRow;
                }

                if (player1Alliances[i].alliance == player2Alliances[j].alliance) {
                    if (player1Alliances[i].joinTime >= player2Alliances[j].joinTime) {
                        if (player1Alliances[i].joinTime < timestamp) {
                            return (player1Alliances[i].alliance, player1Alliances[i].joinTime);
                        } else {
                            // TODO check greater ?
                            alliance = player1Alliances[i].alliance;
                            joinTime = player1Alliances[i].joinTime;
                        }
                    } else {
                        if (player2Alliances[j].joinTime < timestamp) {
                            return (player2Alliances[j].alliance, player2Alliances[j].joinTime);
                        } else {
                            // TODO check greater ?
                            alliance = player2Alliances[j].alliance;
                            joinTime = player2Alliances[j].joinTime;
                        }
                    }
                }
            }
        }
        // console.log(address(alliance));
        // console.log(joinTime);
    }

    // -----------------------------------------------------------------------------------------------------
    // FROM PLAYER
    // -----------------------------------------------------------------------------------------------------

    function joinAlliance(IAlliance alliance, bytes calldata data) external returns (bool joined) {
        Alliances storage alliances = _alliances[msg.sender];
        uint256 slot = 0;
        if (address(alliances.alliance0.alliance) != address(0)) {
            slot++;
        }
        if (address(alliances.alliance1.alliance) != address(0)) {
            slot++;
        }
        if (address(alliances.alliance2.alliance) != address(0)) {
            slot++;
        }
        require(address(alliances.alliance3.alliance) == address(0), "MAX_NUM_ALLIANCES_REACHED");

        joined = alliance.requestToJoin(msg.sender, data);
        if (joined) {
            if (slot == 0) {
                alliances.alliance0.alliance = alliance;
                alliances.alliance0.joinTime = uint96(block.timestamp);
            } else if (slot == 1) {
                alliances.alliance1.alliance = alliance;
                alliances.alliance1.joinTime = uint96(block.timestamp);
            } else if (slot == 2) {
                alliances.alliance2.alliance = alliance;
                alliances.alliance2.joinTime = uint96(block.timestamp);
            } else if (slot == 3) {
                alliances.alliance3.alliance = alliance;
                alliances.alliance3.joinTime = uint96(block.timestamp);
            }

            emit AllianceLink(alliance, msg.sender, true);
        }
    }

    function leaveAlliance(IAlliance alliance) external {
        _leaveAlliance(msg.sender, alliance);
        try alliance.playerHasLeft(msg.sender) {} catch {}
        // TODO ensure callback not failed due to low gas (1/64 rule)
    }

    // -----------------------------------------------------------------------------------------------------
    // FROM ALLIANCE
    // -----------------------------------------------------------------------------------------------------

    function addPlayerToAlliance(address player, uint32 nonce, bytes calldata signature) external {
        _addPlayerToAlliance(player, nonce, signature);
    }

    struct PlayerSubmission {
        address addr;
        uint32 nonce;
        bytes signature;
    }

    function addMultiplePlayersToAlliance(PlayerSubmission[] calldata playerSubmissions) external {
        for (uint256 i = 0; i < playerSubmissions.length; i++) {
            _addPlayerToAlliance(playerSubmissions[i].addr, playerSubmissions[i].nonce, playerSubmissions[i].signature);
        }
    }

    function ejectPlayerFromAlliance(address player) external {
        _leaveAlliance(player, IAlliance(msg.sender));
    }

    // -----------------------------------------------------------------------------------------------------
    // INTERNAL
    // -----------------------------------------------------------------------------------------------------

    function _addPlayerToAlliance(address player, uint32 nonce, bytes calldata signature) internal {
        IAlliance alliance = IAlliance(msg.sender);

        Alliances storage alliances = _alliances[player];
        uint256 slot = 0;
        if (address(alliances.alliance0.alliance) != address(0)) {
            require(alliances.alliance0.alliance != alliance, "ALREADY_JOINED");
            slot++;
        }
        if (address(alliances.alliance1.alliance) != address(0)) {
            require(alliances.alliance1.alliance != alliance, "ALREADY_JOINED");
            slot++;
        }
        if (address(alliances.alliance2.alliance) != address(0)) {
            require(alliances.alliance2.alliance != alliance, "ALREADY_JOINED");
            slot++;
        }
        require(alliances.alliance3.alliance != alliance, "ALREADY_JOINED");
        require(address(alliances.alliance3.alliance) == address(0), "MAX_NUM_ALLIANCES_REACHED");

        uint256 currentNonce = _allianceNonces[player][alliance];
        require(currentNonce == nonce, "INVALID_NONCE");

        bytes memory message;
        if (nonce == 0) {
            message = abi.encodePacked(
                "\x19Ethereum Signed Message:\n56",
                "Join Alliance 0x0000000000000000000000000000000000000000"
            );
            _writeUintAsHex(message, 28 + 55, uint160(msg.sender));
        } else {
            message = abi.encodePacked(
                "\x19Ethereum Signed Message:\n76",
                "Join Alliance 0x0000000000000000000000000000000000000000 (nonce:          0)"
            );
            _writeUintAsHex(message, 28 + 55, uint160(msg.sender));
            _writeUintAsDecimal(message, 28 + 74, nonce);
        }

        // console.log(string(message));

        bytes32 digest = keccak256(message);

        address signer = digest.recover(signature);
        require(player == signer, "INVALID_SIGNATURE");

        if (slot == 0) {
            alliances.alliance0.alliance = alliance;
            alliances.alliance0.joinTime = uint96(block.timestamp);
        } else if (slot == 1) {
            alliances.alliance1.alliance = alliance;
            alliances.alliance1.joinTime = uint96(block.timestamp);
        } else if (slot == 2) {
            alliances.alliance2.alliance = alliance;
            alliances.alliance2.joinTime = uint96(block.timestamp);
        } else if (slot == 3) {
            alliances.alliance3.alliance = alliance;
            alliances.alliance3.joinTime = uint96(block.timestamp);
        }
        _allianceNonces[player][alliance] = nonce + 1;

        emit AllianceLink(alliance, player, true);

        _checkERC1155AndCallSafeTransfer(msg.sender, address(0), player, uint256(uint160(address(alliance))), 1);
        emit TransferSingle(msg.sender, address(0), player, uint256(uint160(address(alliance))), 1);
    }

    bytes internal constant hexAlphabet = "0123456789abcdef";
    bytes internal constant decimalAlphabet = "0123456789";

    function _writeUintAsHex(bytes memory data, uint256 endPos, uint256 num) internal pure {
        while (num != 0) {
            data[endPos--] = bytes1(hexAlphabet[num % 16]);
            num /= 16;
        }
    }

    function _writeUintAsDecimal(bytes memory data, uint256 endPos, uint256 num) internal pure {
        while (num != 0) {
            data[endPos--] = bytes1(decimalAlphabet[num % 10]);
            num /= 10;
        }
    }

    function _leaveAlliance(address player, IAlliance alliance) internal {
        Alliances storage alliances = _alliances[player];

        IAlliance lastSlotAlliance;
        uint96 lastSlotJoinTime;

        require(address(alliances.alliance0.alliance) != address(0), "NOT_PART_OF_ANY_ALLIANCE");

        if (address(alliances.alliance1.alliance) == address(0)) {
            lastSlotAlliance = alliances.alliance0.alliance;
            lastSlotJoinTime = alliances.alliance0.joinTime;
            alliances.alliance0.alliance = IAlliance(address(0));
            alliances.alliance0.joinTime = 0;
        } else {
            if (address(alliances.alliance2.alliance) == address(0)) {
                lastSlotAlliance = alliances.alliance1.alliance;
                lastSlotJoinTime = alliances.alliance1.joinTime;
                alliances.alliance1.alliance = IAlliance(address(0));
                alliances.alliance1.joinTime = 0;
            } else {
                if (address(alliances.alliance3.alliance) == address(0)) {
                    lastSlotAlliance = alliances.alliance2.alliance;
                    lastSlotJoinTime = alliances.alliance2.joinTime;
                    alliances.alliance2.alliance = IAlliance(address(0));
                    alliances.alliance2.joinTime = 0;
                } else {
                    lastSlotAlliance = alliances.alliance3.alliance;
                    lastSlotJoinTime = alliances.alliance3.joinTime;
                    alliances.alliance3.alliance = IAlliance(address(0));
                    alliances.alliance3.joinTime = 0;
                }
            }
        }

        if (alliance != lastSlotAlliance) {
            if (alliances.alliance0.alliance == alliance) {
                alliances.alliance0.alliance = lastSlotAlliance;
                alliances.alliance0.joinTime = lastSlotJoinTime;
            } else if (alliances.alliance1.alliance == alliance) {
                alliances.alliance1.alliance = lastSlotAlliance;
                alliances.alliance1.joinTime = lastSlotJoinTime;
            } else if (alliances.alliance2.alliance == alliance) {
                alliances.alliance2.alliance = lastSlotAlliance;
                alliances.alliance2.joinTime = lastSlotJoinTime;
            } else {
                revert("NOT_PART_OF_THE_ALLIANCE");
            }
        }

        emit AllianceLink(alliance, player, false);
        emit TransferSingle(msg.sender, player, address(0), uint256(uint160(address(alliance))), 1);
    }

    function _msgSender() internal view returns (address) {
        return msg.sender; // TODO metatx
    }

    // ---------------------------------------------------------------------
    // Support For ERC-1155
    // ---------------------------------------------------------------------

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);

    function balanceOf(address owner, uint256 id) external view returns (uint256 balance) {
        require(id == uint160(id), "INVALID_ID");
        (uint96 joinTime, ) = getAllianceData(owner, IAlliance(address(uint160(id))));
        if (joinTime > 0) {
            return 1;
        } else {
            return 0;
        }
    }

    function balanceOfBatch(
        address[] calldata owners,
        uint256[] calldata ids
    ) external view returns (uint256[] memory balances) {
        balances = new uint256[](owners.length);
        for (uint256 i = 0; i < owners.length; i++) {
            require(ids[i] == uint160(ids[i]), "INVALID_ID");
            (uint96 joinTime, ) = getAllianceData(owners[i], IAlliance(address(uint160(ids[i]))));
            if (joinTime > 0) {
                balances[i] = 1;
            } else {
                balances[i] = 0;
            }
        }
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == 0xd9b67a26 || interfaceID == 0x01ffc9a7;
    }

    function _checkERC1155AndCallSafeTransfer(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 value
    ) internal returns (bool) {
        if (!Address.isContract(to)) {
            return true;
        }

        return ERC1155TokenReceiver(to).onERC1155Received(operator, from, id, value, "") == 0xf23a6e61;
    }
}

interface ERC1155TokenReceiver {
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external returns (bytes4);
}
