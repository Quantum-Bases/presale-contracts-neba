// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title KYCRegistry
 * @notice Manages KYC-approved addresses for presale participation
 * @dev Uses role-based access control for whitelist management
 */
contract KYCRegistry is AccessControl {
    bytes32 public constant KYC_MANAGER_ROLE = keccak256("KYC_MANAGER_ROLE");
    
    mapping(address => bool) private _whitelisted;
    
    event AddressWhitelisted(address indexed account);
    event AddressRemovedFromWhitelist(address indexed account);
    
    /**
     * @dev Constructor sets up initial roles
     * @param admin Address that will have DEFAULT_ADMIN_ROLE
     */
    constructor(address admin) {
        require(admin != address(0), "KYCRegistry: zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(KYC_MANAGER_ROLE, admin);
    }
    
    /**
     * @notice Check if an address is KYC approved
     * @param account Address to check
     * @return bool True if the address is whitelisted
     */
    function isKYCApproved(address account) external view returns (bool) {
        return _whitelisted[account];
    }
    
    /**
     * @notice Add a single address to whitelist
     * @param account Address to whitelist
     */
    function addToWhitelist(address account) external onlyRole(KYC_MANAGER_ROLE) {
        require(account != address(0), "KYCRegistry: zero address");
        require(!_whitelisted[account], "KYCRegistry: already whitelisted");
        
        _whitelisted[account] = true;
        emit AddressWhitelisted(account);
    }
    
    /**
     * @notice Remove a single address from whitelist
     * @param account Address to remove
     */
    function removeFromWhitelist(address account) external onlyRole(KYC_MANAGER_ROLE) {
        require(_whitelisted[account], "KYCRegistry: not whitelisted");
        
        _whitelisted[account] = false;
        emit AddressRemovedFromWhitelist(account);
    }
    
    /**
     * @notice Add multiple addresses to whitelist in one transaction
     * @param accounts Array of addresses to whitelist
     */
    function batchAddToWhitelist(address[] calldata accounts) external onlyRole(KYC_MANAGER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            require(account != address(0), "KYCRegistry: zero address");
            
            if (!_whitelisted[account]) {
                _whitelisted[account] = true;
                emit AddressWhitelisted(account);
            }
        }
    }
    
    /**
     * @notice Remove multiple addresses from whitelist in one transaction
     * @param accounts Array of addresses to remove
     */
    function batchRemoveFromWhitelist(address[] calldata accounts) external onlyRole(KYC_MANAGER_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            
            if (_whitelisted[account]) {
                _whitelisted[account] = false;
                emit AddressRemovedFromWhitelist(account);
            }
        }
    }
}

