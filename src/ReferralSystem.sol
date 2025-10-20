// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ReferralSystem
 * @notice Manages referral tracking and rewards for presale
 * @dev Tracks referrals and calculates bonus tokens (5% for referrer, 5% for referee)
 */
contract ReferralSystem is AccessControl {
    bytes32 public constant REFERRAL_ADMIN_ROLE = keccak256("REFERRAL_ADMIN_ROLE");
    bytes32 public constant SALE_ROUND_ROLE = keccak256("SALE_ROUND_ROLE");
    
    struct ReferralData {
        address referrer;
        uint256 totalReferred;
        uint256 totalBonusEarned;
        bool hasReferred;
    }
    
    // Referral bonus percentages (in basis points: 500 = 5%)
    uint256 public referrerBonusBps = 500;  // 5% bonus for referrer
    uint256 public refereeBonusBps = 500;   // 5% bonus for referee
    
    mapping(address => ReferralData) public referralData;
    mapping(address => address[]) public referredUsers;
    
    uint256 public totalReferrals;
    uint256 public totalBonusDistributed;
    
    event ReferralRegistered(address indexed referee, address indexed referrer);
    event ReferralBonusCalculated(
        address indexed referee,
        address indexed referrer,
        uint256 purchaseAmount,
        uint256 referrerBonus,
        uint256 refereeBonus
    );
    event BonusPercentagesUpdated(uint256 referrerBps, uint256 refereeBps);
    
    /**
     * @dev Constructor sets up initial roles
     * @param admin Address that will have admin roles
     */
    constructor(address admin) {
        require(admin != address(0), "ReferralSystem: zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REFERRAL_ADMIN_ROLE, admin);
    }
    
    /**
     * @notice Register a referral relationship
     * @param referee Address being referred
     * @param referrer Address of the referrer
     */
    function registerReferral(address referee, address referrer) 
        external 
        onlyRole(SALE_ROUND_ROLE) 
    {
        require(referee != address(0), "ReferralSystem: zero referee");
        require(referrer != address(0), "ReferralSystem: zero referrer");
        require(referee != referrer, "ReferralSystem: self-referral");
        require(!referralData[referee].hasReferred, "ReferralSystem: already referred");
        
        referralData[referee].referrer = referrer;
        referralData[referee].hasReferred = true;
        
        referredUsers[referrer].push(referee);
        totalReferrals++;
        
        emit ReferralRegistered(referee, referrer);
    }
    
    /**
     * @notice Calculate referral bonus for a purchase
     * @param referee Address making the purchase
     * @param tokenAmount Amount of tokens purchased
     * @return referrer Address of referrer (zero if no referrer)
     * @return referrerBonus Bonus tokens for referrer
     * @return refereeBonus Bonus tokens for referee
     */
    function calculateReferralBonus(address referee, uint256 tokenAmount)
        external
        onlyRole(SALE_ROUND_ROLE)
        returns (address referrer, uint256 referrerBonus, uint256 refereeBonus)
    {
        ReferralData storage data = referralData[referee];
        
        if (!data.hasReferred) {
            return (address(0), 0, 0);
        }
        
        referrer = data.referrer;
        
        // Calculate bonuses (5% each)
        referrerBonus = (tokenAmount * referrerBonusBps) / 10000;
        refereeBonus = (tokenAmount * refereeBonusBps) / 10000;
        
        // Update statistics
        referralData[referrer].totalReferred++;
        referralData[referrer].totalBonusEarned += referrerBonus;
        totalBonusDistributed += (referrerBonus + refereeBonus);
        
        emit ReferralBonusCalculated(referee, referrer, tokenAmount, referrerBonus, refereeBonus);
        
        return (referrer, referrerBonus, refereeBonus);
    }
    
    /**
     * @notice Update referral bonus percentages
     * @param _referrerBps New referrer bonus in basis points (500 = 5%)
     * @param _refereeBps New referee bonus in basis points (500 = 5%)
     */
    function updateBonusPercentages(uint256 _referrerBps, uint256 _refereeBps)
        external
        onlyRole(REFERRAL_ADMIN_ROLE)
    {
        require(_referrerBps <= 1000, "ReferralSystem: referrer bonus too high"); // Max 10%
        require(_refereeBps <= 1000, "ReferralSystem: referee bonus too high"); // Max 10%
        require(_referrerBps + _refereeBps <= 2000, "ReferralSystem: total bonus too high"); // Max 20% total
        
        referrerBonusBps = _referrerBps;
        refereeBonusBps = _refereeBps;
        
        emit BonusPercentagesUpdated(_referrerBps, _refereeBps);
    }
    
    /**
     * @notice Get referrer for an address
     * @param referee Address to check
     * @return referrer Address of referrer (zero if no referrer)
     */
    function getReferrer(address referee) external view returns (address) {
        return referralData[referee].referrer;
    }
    
    /**
     * @notice Check if address has a referrer
     * @param referee Address to check
     * @return bool True if has referrer
     */
    function hasReferrer(address referee) external view returns (bool) {
        return referralData[referee].hasReferred;
    }
    
    /**
     * @notice Get all users referred by an address
     * @param referrer Address to check
     * @return address[] Array of referred users
     */
    function getReferredUsers(address referrer) external view returns (address[] memory) {
        return referredUsers[referrer];
    }
    
    /**
     * @notice Get referral statistics for an address
     * @param user Address to check
     * @return referrer Address of referrer
     * @return totalReferred Total users referred
     * @return totalBonusEarned Total bonus tokens earned
     * @return hasReferred Whether user was referred
     */
    function getReferralStats(address user)
        external
        view
        returns (
            address referrer,
            uint256 totalReferred,
            uint256 totalBonusEarned,
            bool hasReferred
        )
    {
        ReferralData memory data = referralData[user];
        return (data.referrer, data.totalReferred, data.totalBonusEarned, data.hasReferred);
    }
    
    /**
     * @notice Get total referral count for an address
     * @param referrer Address to check
     * @return uint256 Number of users referred
     */
    function getReferralCount(address referrer) external view returns (uint256) {
        return referredUsers[referrer].length;
    }
}

