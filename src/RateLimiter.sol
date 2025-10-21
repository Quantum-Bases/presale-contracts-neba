// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RateLimiter
 * @notice Implements rate limiting to prevent bot activities
 * @dev Tracks transaction count and timing per address
 */
contract RateLimiter is AccessControl {
    bytes32 public constant RATE_ADMIN_ROLE = keccak256("RATE_ADMIN_ROLE");
    bytes32 public constant SALE_ROUND_ROLE = keccak256("SALE_ROUND_ROLE");
    
    struct RateLimit {
        uint256 lastTransactionTime;
        uint256 transactionCount;
        uint256 periodStart;
        uint256 dailySpentUSD; // Daily spending in USD (6 decimals)
        uint256 dailyPeriodStart; // Start of daily spending period
        uint256 totalVolume; // Track volume per period
    }
    
    mapping(address => RateLimit) private _limits;
    
    // Configurable parameters
    uint256 public minTimeBetweenTx = 60; // 1 minute (not 30 seconds)
    uint256 public maxTxPerPeriod = 5; // 5 transactions (not 10)
    uint256 public period = 24 hours;

    // Add per-transaction amount limits
    uint256 public minPurchaseAmount = 100e6; // $100 minimum in USDC decimals
    uint256 public maxPurchaseAmount = 50000e6; // $50,000 maximum in USDC decimals
    
    event RateLimitExceeded(address indexed account, string reason);
    event RateLimitUpdated(uint256 minTimeBetweenTx, uint256 maxTxPerPeriod, uint256 period);
    event RateLimitCheck(address indexed user, uint256 amountUSD, uint256 txCount);
    event LimitReset(address indexed account);
    
    /**
     * @dev Constructor sets up initial roles
     * @param admin Address that will have admin roles
     */
    constructor(address admin) {
        require(admin != address(0), "RateLimiter: zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RATE_ADMIN_ROLE, admin);
    }
    
    /**
     * @notice Check rate limit and update if passed
     * @param account Address to check
     * @param usdAmount USD amount being spent (6 decimals)
     * @dev Reverts if rate limit is exceeded
     */
    function checkAndUpdateLimit(address account, uint256 usdAmount) external onlyRole(SALE_ROUND_ROLE) {
        RateLimit storage limit = _limits[account];
        uint256 currentTime = block.timestamp;

        // Check time between transactions
        require(
            currentTime >= limit.lastTransactionTime + minTimeBetweenTx,
            "RateLimiter: transaction too frequent"
        );

        // Check amount limits
        require(
            usdAmount >= minPurchaseAmount && usdAmount <= maxPurchaseAmount,
            "RateLimiter: amount out of bounds"
        );

        // Reset period if needed
        if (currentTime >= limit.periodStart + period) {
            limit.periodStart = currentTime;
            limit.transactionCount = 0;
            limit.totalVolume = 0;
        }

        // Check transaction count
        require(limit.transactionCount < maxTxPerPeriod, "RateLimiter: too many transactions");

        // Update activity
        limit.lastTransactionTime = currentTime;
        limit.transactionCount++;
        limit.totalVolume += usdAmount;

        emit RateLimitCheck(account, usdAmount, limit.transactionCount);
    }
    
    /**
     * @notice Reset rate limit for an address
     * @param account Address to reset
     */
    function resetLimit(address account) external onlyRole(RATE_ADMIN_ROLE) {
        delete _limits[account];
        emit LimitReset(account);
    }
    
    /**
     * @notice Update rate limit parameters
     * @param _minTimeBetweenTx New minimum time between transactions
     * @param _maxTxPerPeriod New maximum transactions per period
     * @param _period New period duration
     */
    function updateRateLimitConfig(
        uint256 _minTimeBetweenTx,
        uint256 _maxTxPerPeriod,
        uint256 _period
    ) external onlyRole(RATE_ADMIN_ROLE) {
        require(_minTimeBetweenTx > 0, "RateLimiter: invalid min time");
        require(_maxTxPerPeriod > 0, "RateLimiter: invalid max tx");
        require(_period > 0, "RateLimiter: invalid period");
        
        minTimeBetweenTx = _minTimeBetweenTx;
        maxTxPerPeriod = _maxTxPerPeriod;
        period = _period;
        
        emit RateLimitUpdated(_minTimeBetweenTx, _maxTxPerPeriod, _period);
    }
    
    // /**
    //  * @notice Update daily spending limit
    //  * @param _maxDailySpendingUSD New maximum daily spending in USD (6 decimals)
    //  */
    // function updateDailySpendingLimit(uint256 _maxDailySpendingUSD) external onlyRole(RATE_ADMIN_ROLE) {
    //     require(_maxDailySpendingUSD > 0, "RateLimiter: invalid daily spending limit");
        
    //     maxDailySpendingUSD = _maxDailySpendingUSD;
    //     emit DailySpendingLimitUpdated(_maxDailySpendingUSD);
    // }
    
    /**
     * @notice Get rate limit info for an address
     * @param account Address to query
     * @return lastTxTime Last transaction timestamp
     * @return txCount Transaction count in current period
     * @return periodStart Start of current period
     * @return dailySpentUSD Daily spending in USD (6 decimals)
     * @return dailyPeriodStart Start of daily spending period
     * @return totalVolume Total volume in current period
     */
    function getRateLimitInfo(address account) external view returns (
        uint256 lastTxTime,
        uint256 txCount,
        uint256 periodStart,
        uint256 dailySpentUSD,
        uint256 dailyPeriodStart,
        uint256 totalVolume
    ) {
        RateLimit memory limit = _limits[account];
        return (
            limit.lastTransactionTime,
            limit.transactionCount,
            limit.periodStart,
            limit.dailySpentUSD,
            limit.dailyPeriodStart,
            limit.totalVolume
        );
    }
}

