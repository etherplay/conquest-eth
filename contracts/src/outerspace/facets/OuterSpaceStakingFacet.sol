// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "./OuterSpaceFacetBase.sol";

contract OuterSpaceStakingFacet is OuterSpaceFacetBase {
    constructor(Config memory config) OuterSpaceFacetBase(config) {}

    // ---------------------------------------------------------------------------------------------------------------
    // STAKING / PRODUCTION CAPTURE
    // ---------------------------------------------------------------------------------------------------------------

    function onTokenTransfer(address, uint256 amount, bytes calldata data) public returns (bool) {
        bool freegift;
        if (msg.sender == address(_freeStakingToken)) {
            freegift = true;
        } else {
            require(msg.sender == address(_stakingToken), "INVALID_ERC20");
        }

        // adhoc support for multiple claim at once
        if (data.length > 64) {
            (address acquirer, uint256[] memory locations) = abi.decode(data, (address, uint256[]));
            uint256 total = 0;
            for (uint256 i = 0; i < locations.length; i++) {
                uint256 stake = uint256(_stake(_planetData(locations[i]))) * (DECIMALS_14);
                _acquire(acquirer, stake, locations[i], freegift); // we do not care of who the payer is
                total += stake;
            }
            require(amount == total, "INVALID_AMOUNT");
        } else {
            (address acquirer, uint256 location) = abi.decode(data, (address, uint256));
            _acquire(acquirer, amount, location, freegift); // we do not care of who the payer is
        }
        return true;
    }

    function onTokenPaidFor(address, address forAddress, uint256 amount, bytes calldata data) external returns (bool) {
        bool freegift;
        if (msg.sender == address(_freeStakingToken)) {
            freegift = true;
        } else {
            require(msg.sender == address(_stakingToken), "INVALID_ERC20");
        }
        uint256 location = abi.decode(data, (uint256));
        _acquire(forAddress, amount, location, freegift); // we do not care of who the payer is
        return true;
    }

    function acquireViaTransferFrom(uint256 location, uint256 amount) public {
        address sender = _msgSender();
        _acquire(sender, amount, location, false);
        _stakingToken.transferFrom(sender, address(this), amount);
    }

    function acquireViaFreeTokenTransferFrom(uint256 location, uint256 amount) public {
        address sender = _msgSender();
        _acquire(sender, amount, location, true);
        _freeStakingToken.transferFrom(sender, address(this), amount);
    }

    function acquireViaNativeTokenAndStakingToken(
        uint256 location,
        uint256 amountToMint,
        uint256 tokenAmount
    ) public payable {
        // TODO permit
        address sender = msg.sender;
        _acquire(sender, amountToMint + tokenAmount, location, false);
        _stakingToken.mint{value: msg.value}(address(this), amountToMint);
        _stakingToken.transferFrom(sender, address(this), tokenAmount);
    }

    function acquireMultipleViaNativeTokenAndStakingToken(
        uint256[] memory locations,
        uint256 amountToMint,
        uint256 tokenAmount
    ) public payable {
        // TODO permit
        address sender = msg.sender;
        uint256 total = 0;
        for (uint256 i = 0; i < locations.length; i++) {
            uint256 stake = uint256(_stake(_planetData(locations[i]))) * (DECIMALS_14);
            _acquire(sender, stake, locations[i], false);
            total += stake;
        }
        require(amountToMint + tokenAmount == total, "INVALID_AMOUNT");
        _stakingToken.mint{value: msg.value}(address(this), amountToMint);
        _stakingToken.transferFrom(sender, address(this), tokenAmount);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // EXIT / WITHDRAWALS
    // ---------------------------------------------------------------------------------------------------------------

    function exitFor(address owner, uint256 location) external {
        address operator = _msgSender();
        if (operator != owner) {
            require(_operators[owner][operator], "NOT_AUTHORIZED_TO_SEND");
        }
        _unsafe_exit_for(owner, location);
    }

    function exitMultipleFor(address owner, uint256[] calldata locations) external {
        address operator = _msgSender();
        if (operator != owner) {
            require(_operators[owner][operator], "NOT_AUTHORIZED_TO_SEND");
        }
        uint256 numLocations = locations.length;
        for (uint256 i = 0; i < numLocations; i++) {
            _unsafe_exit_for(owner, locations[i]);
        }
    }

    function fetchAndWithdrawFor(address owner, uint256[] calldata locations) external {
        _fetchAndWithdrawFor(owner, locations);
    }

    function balanceToWithdraw(address owner) external view returns (uint256) {
        return _stakeReadyToBeWithdrawn[owner];
    }

    function withdrawFor(address owner) external {
        uint256 amount = _stakeReadyToBeWithdrawn[owner];
        _unsafe_withdrawAll(owner, amount);
    }
}
