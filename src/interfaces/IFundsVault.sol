// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFundsVault {
    function depositETH() external payable;
    function depositToken(address token, uint256 amount) external;
    function withdrawETH(address to, uint256 amount) external;
    function withdrawToken(address token, address to, uint256 amount) external;
}

