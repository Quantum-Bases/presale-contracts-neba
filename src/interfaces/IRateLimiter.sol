// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRateLimiter {
    function checkAndUpdateLimit(address account, uint256 usdAmount) external;
    function resetLimit(address account) external;
    function getRateLimitInfo(address account) external view returns (
        uint256 lastTxTime,
        uint256 txCount,
        uint256 periodStart,
        uint256 dailySpentUSD,
        uint256 dailyPeriodStart
    );
    function maxDailySpendingUSD() external view returns (uint256);
}

