// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./AllianceRegistry.sol";
// import "../interfaces/IAlliance.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BasicAlliance {
    using ECDSA for bytes32;

    bool internal _original;
    AllianceRegistry internal immutable _allianceRegistry;
    address public admin;

    string internal _baseURI;

    mapping(address => uint32) public memberNonces;

    // constructor(AllianceRegistry allianceRegistry, AllianceRegistry.PlayerSubmission[] memory playerSubmissions) {
    //     _allianceRegistry = allianceRegistry;
    //     _allianceRegistry.addMultiplePlayersToAlliance(playerSubmissions);
    // }

    constructor(AllianceRegistry allianceRegistry, string memory baseURI) {
        _allianceRegistry = allianceRegistry;
        _original = true;
        admin = address(1); // lock it
        init(baseURI);
    }

    function init(string memory baseURI) public {
        require(bytes(_baseURI).length == 0, "ALREADY_INITIALISED");
        _baseURI = baseURI;
    }

    function frontendURI() external view returns (string memory) {
        return string(bytes.concat(bytes(_baseURI), bytes(Strings.toHexString(uint256(uint160(address(this))), 20))));
    }

    function setAdminAndAddMembers(address newAdmin, AllianceRegistry.PlayerSubmission[] calldata playerSubmissions)
        public
    {
        address currentAdmin = admin;
        require(currentAdmin == address(0) || msg.sender == currentAdmin, "NOT_ALLOWED");
        admin = newAdmin;
        if (playerSubmissions.length > 0) {
            _allianceRegistry.addMultiplePlayersToAlliance(playerSubmissions);
        }
    }

    function addMembers(AllianceRegistry.PlayerSubmission[] calldata playerSubmissions) external {
        require(msg.sender == admin, "NOT_ALLOWED");
        _allianceRegistry.addMultiplePlayersToAlliance(playerSubmissions);
    }

    function removeMember(address player) external {
        require(msg.sender == admin, "NOT_ALLOWED");
        _allianceRegistry.ejectPlayerFromAlliance(player);
    }

    function claimInvite(
        address player,
        uint32 nonce,
        bytes calldata signature,
        uint32 inviteNonce,
        bytes calldata inviteSignature
    ) external {
        uint256 currentNonce = memberNonces[player];
        require(currentNonce == inviteNonce, "INVALID_NONCE");
        memberNonces[player] = inviteNonce + 1;

        bytes memory message;
        if (inviteNonce == 0) {
            message = abi.encodePacked(
                "\x19Ethereum Signed Message:\n111",
                "Invite Player 0x0000000000000000000000000000000000000000 To Alliance 0x0000000000000000000000000000000000000000"
            );
            _writeUintAsHex(message, 29 + 55, uint160(player));
            _writeUintAsHex(message, 29 + 110, uint160(address(this)));
        } else {
            message = abi.encodePacked(
                "\x19Ethereum Signed Message:\n131",
                "Invite Player 0x0000000000000000000000000000000000000000 To Alliance 0x0000000000000000000000000000000000000000 (nonce:          0)"
            );
            _writeUintAsHex(message, 29 + 55, uint160(player));
            _writeUintAsHex(message, 29 + 110, uint160(address(this)));
            _writeUintAsDecimal(message, 29 + 129, inviteNonce);
        }
        bytes32 digest = keccak256(message);

        address signer = digest.recover(inviteSignature);
        require(admin == signer, "INVALID_INVITE_SIGNATURE");

        _allianceRegistry.addPlayerToAlliance(player, nonce, signature);
    }

    function instantiate(
        address initialAdmin,
        AllianceRegistry.PlayerSubmission[] calldata playerSubmissions,
        bytes32 salt
    ) external {
        require(_original, "CANNOT_INSTANTIATE_FROM_CLONES");
        address newAlliance = Clones.cloneDeterministic(address(this), keccak256(abi.encodePacked(salt, msg.sender)));
        BasicAlliance(newAlliance).init(_baseURI);
        BasicAlliance(newAlliance).setAdminAndAddMembers(initialAdmin, playerSubmissions);
    }

    function getAddress(bytes32 salt) external view returns (address) {
        require(_original, "CANNOT_INSTANTIATE_FROM_CLONES");
        return
            Clones.predictDeterministicAddress(
                address(this),
                keccak256(abi.encodePacked(salt, msg.sender)),
                address(this)
            );
    }

    // function requestToJoin(address player, bytes calldata data) external view returns (bool) {
    //     if (player == _initialMember) {
    //         return true;
    //     } else {
    //         bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", "Add ", ));
    //         address signer = digest.recover(signature);
    //         require(_outerspace.allianceJoinTime(signer, this), "ONLY_ALLIANCE_MEMBER_CAN_INVITE");
    //     }
    // }

    // function playerHasLeft(address player) external {

    // }

    // TODO library
    bytes internal constant hexAlphabet = "0123456789abcdef";
    bytes internal constant decimalAlphabet = "0123456789";

    function _writeUintAsHex(
        bytes memory data,
        uint256 endPos,
        uint256 num
    ) internal pure {
        while (num != 0) {
            data[endPos--] = bytes1(hexAlphabet[num % 16]);
            num /= 16;
        }
    }

    function _writeUintAsDecimal(
        bytes memory data,
        uint256 endPos,
        uint256 num
    ) internal pure {
        while (num != 0) {
            data[endPos--] = bytes1(decimalAlphabet[num % 10]);
            num /= 10;
        }
    }
}
