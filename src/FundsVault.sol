// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FundsVault
 * @notice Secure vault for storing presale proceeds (ETH, USDC, USDT)
 * @dev Only authorized contracts can deposit, withdrawals require multisig
 */
contract FundsVault is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public immutable multisig;
    mapping(address => bool) public authorizedDepositors;
    
    event ETHDeposited(address indexed from, uint256 amount);
    event TokenDeposited(address indexed token, address indexed from, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event TokenWithdrawn(address indexed token, address indexed to, uint256 amount);
    event DepositorAuthorized(address indexed depositor);
    event DepositorRevoked(address indexed depositor);
    
    modifier onlyMultisig() {
        require(msg.sender == multisig, "FundsVault: not multisig");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedDepositors[msg.sender], "FundsVault: not authorized");
        _;
    }
    
    /**
     * @dev Constructor sets the multisig address
     * @param _multisig Address of the multisig wallet
     */
    constructor(address _multisig) {
        require(_multisig != address(0), "FundsVault: zero address");
        multisig = _multisig;
    }
    
    /**
     * @notice Authorize an address to deposit funds
     * @param depositor Address to authorize
     */
    function authorizeDepositor(address depositor) external onlyMultisig {
        require(depositor != address(0), "FundsVault: zero address");
        require(!authorizedDepositors[depositor], "FundsVault: already authorized");
        
        authorizedDepositors[depositor] = true;
        emit DepositorAuthorized(depositor);
    }
    
    /**
     * @notice Revoke deposit authorization
     * @param depositor Address to revoke
     */
    function revokeDepositor(address depositor) external onlyMultisig {
        require(authorizedDepositors[depositor], "FundsVault: not authorized");
        
        authorizedDepositors[depositor] = false;
        emit DepositorRevoked(depositor);
    }
    
    /**
     * @notice Deposit ETH to the vault
     */
    function depositETH() external payable onlyAuthorized {
        require(msg.value > 0, "FundsVault: zero amount");
        emit ETHDeposited(msg.sender, msg.value);
    }
    
    /**
     * @notice Deposit ERC20 tokens to the vault
     * @param token Token address
     * @param amount Amount to deposit
     */
    function depositToken(address token, uint256 amount) external onlyAuthorized {
        require(token != address(0), "FundsVault: zero address");
        require(amount > 0, "FundsVault: zero amount");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TokenDeposited(token, msg.sender, amount);
    }
    
    /**
     * @notice Withdraw ETH from the vault (multisig only)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawETH(address to, uint256 amount) external onlyMultisig nonReentrant {
        require(to != address(0), "FundsVault: zero address");
        require(amount > 0, "FundsVault: zero amount");
        require(address(this).balance >= amount, "FundsVault: insufficient balance");
        
        (bool success, ) = to.call{value: amount}("");
        require(success, "FundsVault: ETH transfer failed");
        
        emit ETHWithdrawn(to, amount);
    }
    
    /**
     * @notice Withdraw ERC20 tokens from the vault (multisig only)
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawToken(address token, address to, uint256 amount) external onlyMultisig nonReentrant {
        require(token != address(0), "FundsVault: zero token address");
        require(to != address(0), "FundsVault: zero recipient address");
        require(amount > 0, "FundsVault: zero amount");
        
        IERC20(token).safeTransfer(to, amount);
        emit TokenWithdrawn(token, to, amount);
    }
    
    /**
     * @notice Get ETH balance
     * @return uint256 ETH balance
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Get token balance
     * @param token Token address
     * @return uint256 Token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {
        revert("FundsVault: use depositETH");
    }
}

