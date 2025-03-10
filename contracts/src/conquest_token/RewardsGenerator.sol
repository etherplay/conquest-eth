// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";
import "../outerspace/interfaces/IOnStakeChange.sol";
import "./IReward.sol";

contract RewardsGenerator is IERC20, Proxied, IOnStakeChange {
    uint256 internal constant PRECISION = 1e24;
    uint256 internal constant DECIMALS_18_MILLIONTH = 1000000000000; // 1 millionth of a token so that it matches with REWARD_RATE_millionth

    uint256 public immutable REWARD_RATE_millionth;
    uint256 public immutable FIXED_REWARD_RATE_thousands_millionth;

    event GameEnabled(address indexed game, uint256 weight, uint256 timestamp);

    struct GlobalState {
        uint40 lastUpdateTime;
        uint104 totalRewardPerPointAtLastUpdate; // PRECISION = 1e24
        uint112 totalPoints;
    }
    GlobalState _global;

    struct SharedRatePerAccount {
        uint112 points;
        uint104 totalRewardPerPointAccounted; // PRECISION = 1e24
        // we do not pack here as we want to keep precision
        uint112 rewardsToWithdraw;
    }

    mapping(address => SharedRatePerAccount) _sharedRateRewardPerAccount;

    struct FixedRate {
        uint112 toWithdraw;
        uint40 lastTime;
    }
    mapping(address => FixedRate) internal _fixedRateRewardPerAccount;

    mapping(address => uint256) internal _games;

    IReward public immutable reward;

    struct Config {
        uint256 rewardRateMillionth;
        uint256 fixedRewardRateThousandsMillionth;
    }

    struct InitialAccount {
        address account;
        uint256 amount;
    }

    bool internal _init;

    constructor(
        IReward rewardAddress,
        Config memory config,
        address[] memory initialGames,
        InitialAccount[] memory initialAccounts
    ) {
        reward = rewardAddress;
        REWARD_RATE_millionth = config.rewardRateMillionth;
        FIXED_REWARD_RATE_thousands_millionth = config.fixedRewardRateThousandsMillionth;

        _postUpgrade(rewardAddress, config, initialGames, initialAccounts);
    }

    function postUpgrade(
        IReward rewardAddress,
        Config memory config,
        address[] memory initialGames,
        InitialAccount[] memory initialAccounts
    ) external onlyProxyAdmin {
        _postUpgrade(rewardAddress, config, initialGames, initialAccounts);
    }

    function _postUpgrade(
        IReward,
        Config memory,
        address[] memory initialGames,
        InitialAccount[] memory initialAccounts
    ) internal {
        if (!_init) {
            for (uint256 i = 0; i < initialGames.length; i++) {
                _enableGame(initialGames[i], 1000000000000000000);
            }
            for (uint256 i = 0; i < initialAccounts.length; i++) {
                _add(initialAccounts[i].account, initialAccounts[i].amount);
            }
            _init = true;
        }
    }

    string public constant symbol = "POINT";

    function name() public pure returns (string memory) {
        return "Conquest v0 Points";
    }

    function enableGame(address game, uint256 weight) external onlyProxyAdmin {
        _enableGame(game, weight);
    }

    function _enableGame(address game, uint256 weight) internal {
        _games[game] = weight;
        emit GameEnabled(game, weight, block.timestamp);
    }

    /// @inheritdoc IOnStakeChange
    function add(address account, uint256 amount) external override onlyGames {
        _add(account, amount);
    }

    function _add(address account, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        (uint256 totalPointsSoFar, uint256 accountPointsSoFar) = _update(account);

        unchecked {
            // update total points and the account's point, their reward will be counted on next interaction.
            _global.totalPoints = uint112(totalPointsSoFar + amount);
            _sharedRateRewardPerAccount[account].points = uint112(accountPointsSoFar + amount);
        }
        emit Transfer(address(0), account, amount);
    }

    /// @inheritdoc IOnStakeChange
    function remove(address account, uint256 amount) external override onlyGames {
        _remove(account, amount);
    }

    function _remove(address account, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        // update the amount generated, store it in
        (uint256 totalPointsSoFar, uint256 accountPointsSoFar) = _update(account);

        unchecked {
            // update total points and the account's point, their reward will be counted on next interaction.
            _global.totalPoints = uint112(totalPointsSoFar - amount);
            _sharedRateRewardPerAccount[account].points = uint112(accountPointsSoFar - amount);
        }
        emit Transfer(account, address(0), amount);
    }

    /// @inheritdoc IOnStakeChange
    function move(address from, address to, uint256 amount) external override onlyGames {
        _remove(from, amount);
        _add(to, amount);
    }

    function totalSupply() external view override returns (uint256) {
        return _global.totalPoints;
    }

    function balanceOf(address owner) external view override returns (uint256) {
        return _sharedRateRewardPerAccount[owner].points;
    }

    function allowance(address, address) external pure override returns (uint256) {
        return 0;
    }

    function decimals() external pure virtual returns (uint8) {
        return uint8(18);
    }

    function transfer(address, uint256) external returns (bool) {
        revert("NON_TRANSFERABLE");
    }

    function approve(address, uint256) external returns (bool) {
        revert("NON_TRANSFERABLE");
    }

    function transferFrom(address, address, uint256) external returns (bool) {
        revert("NON_TRANSFERABLE");
    }

    /// @notice update the global pool rate
    function update() external {
        _updateGlobal();
    }

    function lastUpdated() external view returns (uint256) {
        return _global.lastUpdateTime;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // For Accounts
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice claim the rewards earned so far in the shared pool
    function claimSharedPoolRewards(address to) external {
        address account = msg.sender;
        uint256 accountPointsSoFar = _sharedRateRewardPerAccount[account].points;

        (, uint256 totalRewardPerPoint) = _updateGlobal();
        uint256 amount = _computeRewardsEarned(
            _sharedRateRewardPerAccount[account].totalRewardPerPointAccounted,
            accountPointsSoFar,
            totalRewardPerPoint,
            _sharedRateRewardPerAccount[account].rewardsToWithdraw
        );
        _sharedRateRewardPerAccount[account].totalRewardPerPointAccounted = uint104(totalRewardPerPoint);

        if (amount > 0) {
            _sharedRateRewardPerAccount[account].rewardsToWithdraw = 0;
            reward.reward(to, amount);
        }
    }

    /// @notice claim the rewards earned so far using a fixed rate per point
    function claimFixedRewards(address to) external {
        address account = msg.sender;
        uint256 amount = earnedFromFixedRate(account);
        if (amount > 0) {
            _fixedRateRewardPerAccount[account].lastTime = uint40(block.timestamp);
            _fixedRateRewardPerAccount[account].toWithdraw = 0;
            reward.reward(to, amount);
        }
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------------------------------------------------------

    /// @notice The amount of reward each point has earned so far
    function getTotalRewardPerPointWithPrecision24() external view returns (uint256) {
        return
            _global.totalRewardPerPointAtLastUpdate +
            _computeExtraTotalRewardPerPointSinceLastTime(
                _global.totalPoints,
                REWARD_RATE_millionth,
                _global.lastUpdateTime
            );
    }

    /// @notice The amount of reward an account has accrued so far. Does not include already withdrawn rewards.
    function earnedFromPoolRate(address account) external view returns (uint256) {
        return
            _computeRewardsEarned(
                _sharedRateRewardPerAccount[account].totalRewardPerPointAccounted,
                _sharedRateRewardPerAccount[account].points,
                _global.totalRewardPerPointAtLastUpdate +
                    _computeExtraTotalRewardPerPointSinceLastTime(
                        _global.totalPoints,
                        REWARD_RATE_millionth,
                        _global.lastUpdateTime
                    ),
                _sharedRateRewardPerAccount[account].rewardsToWithdraw
            );
    }

    /// @notice The amount of reward an account has accrued so far. Does not include already withdrawn rewards.
    function earnedFromFixedRate(address account) public view returns (uint256) {
        uint256 lastTime = _fixedRateRewardPerAccount[account].lastTime;
        if (lastTime < 1739550865) {
            lastTime = 1739550865;
        }
        uint256 extraFixed = ((block.timestamp - lastTime) *
            _sharedRateRewardPerAccount[account].points *
            FIXED_REWARD_RATE_thousands_millionth) / 1000000000;
        return extraFixed + _fixedRateRewardPerAccount[account].toWithdraw;
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Internal
    // ---------------------------------------------------------------------------------------------------------------

    function _computeRewardsEarned(
        uint256 totalRewardPerPointAccountedSoFar,
        uint256 accountPoints,
        uint256 currentTotalRewardPerPoint,
        uint256 accountRewardsSoFar
    ) internal pure returns (uint256) {
        return
            accountRewardsSoFar +
            (((accountPoints * (currentTotalRewardPerPoint - totalRewardPerPointAccountedSoFar)) *
                DECIMALS_18_MILLIONTH) / PRECISION);
    }

    function _computeExtraTotalRewardPerPointSinceLastTime(
        uint256 totalPoints,
        uint256 rewardRateMillionth,
        uint256 lastUpdateTime
    ) internal view returns (uint256) {
        if (totalPoints == 0) {
            return 0;
        }
        return ((block.timestamp - lastUpdateTime) * rewardRateMillionth * PRECISION) / totalPoints;
    }

    function _updateGlobal() internal returns (uint256 totalPointsSoFar, uint256 totalRewardPerPointAllocatedSoFar) {
        totalPointsSoFar = _global.totalPoints;

        uint256 extraTotalRewardPerPoint = _computeExtraTotalRewardPerPointSinceLastTime(
            totalPointsSoFar,
            REWARD_RATE_millionth,
            _global.lastUpdateTime
        );

        totalRewardPerPointAllocatedSoFar = _global.totalRewardPerPointAtLastUpdate + extraTotalRewardPerPoint;

        _global.totalRewardPerPointAtLastUpdate = uint104(totalRewardPerPointAllocatedSoFar);
        _global.lastUpdateTime = uint40(block.timestamp);
    }

    function _updateAccount(
        address account,
        uint256 totalRewardPerPointAllocatedSoFar
    ) internal returns (uint256 accountPointsSoFar) {
        accountPointsSoFar = _sharedRateRewardPerAccount[account].points;

        // update the reward that can be withdrawn, catching up account state to global
        _sharedRateRewardPerAccount[account].rewardsToWithdraw = uint112(
            _computeRewardsEarned(
                // last checkpoint : when was the account last updated
                _sharedRateRewardPerAccount[account].totalRewardPerPointAccounted,
                accountPointsSoFar,
                totalRewardPerPointAllocatedSoFar,
                // rewards already registered
                _sharedRateRewardPerAccount[account].rewardsToWithdraw
            )
        );
        _sharedRateRewardPerAccount[account].totalRewardPerPointAccounted = uint104(totalRewardPerPointAllocatedSoFar);

        uint256 lastTime = _fixedRateRewardPerAccount[account].lastTime;
        if (lastTime < 1739550865) {
            lastTime = 1739550865;
        }
        uint256 extraFixed = ((block.timestamp - lastTime) *
            accountPointsSoFar *
            FIXED_REWARD_RATE_thousands_millionth) / 1000000000;
        _fixedRateRewardPerAccount[account].lastTime = uint40(block.timestamp);
        _fixedRateRewardPerAccount[account].toWithdraw += uint112(extraFixed);
    }

    function _update(address account) internal returns (uint256, uint256) {
        (uint256 totalPointsSoFar, uint256 totalRewardPerPointAllocatedSoFar) = _updateGlobal();
        uint256 accountPointsSoFar = _updateAccount(account, totalRewardPerPointAllocatedSoFar);
        return (totalPointsSoFar, accountPointsSoFar);
    }

    // ---------------------------------------------------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------------------------------------------------

    modifier onlyGames() {
        require(_games[msg.sender] > 0, "NOT_AUTHORIZED_GAME");
        _;
    }
}
