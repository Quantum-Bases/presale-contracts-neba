// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVestingVault {
    function createVesting(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external;
    
    function claimVested() external;
    function getVestedAmount(address beneficiary) external view returns (uint256);
    function getClaimableAmount(address beneficiary) external view returns (uint256);
}

