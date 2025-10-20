// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IKYCRegistry} from "./interfaces/IKYCRegistry.sol";
import {IRateLimiter} from "./interfaces/IRateLimiter.sol";
import {IVestingVault} from "./interfaces/IVestingVault.sol";
import {IFundsVault} from "./interfaces/IFundsVault.sol";
import {ReferralSystem} from "./ReferralSystem.sol";

/**
 * @title SaleRound
 * @notice Handles individual presale round logic
 * @dev Manages purchases, conversions, and token distribution
 */
contract SaleRound is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    struct RoundConfig {
        string name;
        uint256 tokenPriceUSD; // Price in USD with 6 decimals (e.g., 0.05 USD = 50000)
        uint256 hardCapUSD; // Hard cap in USD with 6 decimals
        uint256 startTime;
        uint256 endTime;
        uint256 cliffDuration;
        uint256 vestingDuration;
        bool isActive;
    }
    
    RoundConfig public config;
    
    address public immutable manager;
    IERC20 public immutable nebaToken;
    IKYCRegistry public immutable kycRegistry;
    IRateLimiter public immutable rateLimiter;
    IVestingVault public immutable vestingVault;
    IFundsVault public immutable fundsVault;
    ReferralSystem public immutable referralSystem;
    
    // Supported payment tokens
    IERC20 public immutable usdc;
    IERC20 public immutable usdt;
    
    // Chainlink-like oracle addresses for price feeds (ETH/USD, etc.)
    // For simplicity, we'll use a simple oracle pattern
    address public ethUSDOracle;
    
    uint256 public totalRaisedUSD; // Total raised in USD (6 decimals)
    uint256 public totalTokensSold; // Total tokens sold (18 decimals)
    
    mapping(address => uint256) public contributions; // User contributions in USD
    mapping(address => uint256) public tokenAllocations; // User token allocations
    mapping(address => uint256) public bonusTokens; // Bonus tokens from referrals
    
    event Purchase(
        address indexed buyer,
        address indexed paymentToken,
        uint256 paymentAmount,
        uint256 usdValue,
        uint256 tokenAmount
    );
    event ReferralBonusDistributed(
        address indexed referee,
        address indexed referrer,
        uint256 referrerBonus,
        uint256 refereeBonus
    );
    event ConfigUpdated(RoundConfig config);
    event OracleUpdated(address indexed oracle);
    
    modifier onlyManager() {
        require(msg.sender == manager, "SaleRound: not manager");
        _;
    }
    
    modifier roundActive() {
        require(config.isActive, "SaleRound: not active");
        require(block.timestamp >= config.startTime, "SaleRound: not started");
        require(block.timestamp <= config.endTime, "SaleRound: ended");
        require(totalRaisedUSD < config.hardCapUSD, "SaleRound: hard cap reached");
        _;
    }
    
    /**
     * @dev Constructor sets up the sale round
     */
    constructor(
        address _manager,
        address _nebaToken,
        address _kycRegistry,
        address _rateLimiter,
        address _vestingVault,
        address _fundsVault,
        address _referralSystem,
        address _usdc,
        address _usdt,
        address _ethUSDOracle,
        RoundConfig memory _config
    ) {
        require(_manager != address(0), "SaleRound: zero manager");
        require(_nebaToken != address(0), "SaleRound: zero token");
        require(_kycRegistry != address(0), "SaleRound: zero kyc");
        require(_rateLimiter != address(0), "SaleRound: zero limiter");
        require(_vestingVault != address(0), "SaleRound: zero vesting");
        require(_fundsVault != address(0), "SaleRound: zero funds");
        require(_referralSystem != address(0), "SaleRound: zero referral");
        require(_usdc != address(0), "SaleRound: zero usdc");
        require(_usdt != address(0), "SaleRound: zero usdt");
        require(_ethUSDOracle != address(0), "SaleRound: zero oracle");
        
        manager = _manager;
        nebaToken = IERC20(_nebaToken);
        kycRegistry = IKYCRegistry(_kycRegistry);
        rateLimiter = IRateLimiter(_rateLimiter);
        vestingVault = IVestingVault(_vestingVault);
        fundsVault = IFundsVault(_fundsVault);
        referralSystem = ReferralSystem(_referralSystem);
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
        ethUSDOracle = _ethUSDOracle;
        
        config = _config;
    }
    
    /**
     * @notice Buy tokens with USDC
     * @param usdcAmount Amount of USDC to spend (6 decimals)
     * @param referrer Address of referrer (use address(0) if no referrer)
     */
    function buyWithUSDC(uint256 usdcAmount, address referrer) external nonReentrant whenNotPaused roundActive {
        uint256 usdValue = usdcAmount; // USDC has 6 decimals, same as our USD representation
        _checkEligibility(msg.sender, usdValue);
        
        uint256 tokenAmount = _calculateTokenAmount(usdValue);
        
        _processPurchase(msg.sender, address(usdc), usdcAmount, usdValue, tokenAmount, referrer);
        
        // Transfer USDC from buyer to this contract, then to FundsVault
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        usdc.approve(address(fundsVault), usdcAmount);
        fundsVault.depositToken(address(usdc), usdcAmount);
    }
    
    /**
     * @notice Buy tokens with USDT
     * @param usdtAmount Amount of USDT to spend (6 decimals)
     * @param referrer Address of referrer (use address(0) if no referrer)
     */
    function buyWithUSDT(uint256 usdtAmount, address referrer) external nonReentrant whenNotPaused roundActive {
        uint256 usdValue = usdtAmount; // USDT has 6 decimals, same as our USD representation
        _checkEligibility(msg.sender, usdValue);
        
        uint256 tokenAmount = _calculateTokenAmount(usdValue);
        
        _processPurchase(msg.sender, address(usdt), usdtAmount, usdValue, tokenAmount, referrer);
        
        // Transfer USDT from buyer to this contract, then to FundsVault
        usdt.safeTransferFrom(msg.sender, address(this), usdtAmount);
        usdt.approve(address(fundsVault), usdtAmount);
        fundsVault.depositToken(address(usdt), usdtAmount);
    }
    
    /**
     * @notice Buy tokens with ETH
     * @param referrer Address of referrer (use address(0) if no referrer)
     */
    function buyWithETH(address referrer) external payable nonReentrant whenNotPaused roundActive {
        require(msg.value > 0, "SaleRound: zero ETH");
        
        uint256 ethPrice = _getETHPrice(); // ETH price in USD with 6 decimals
        uint256 usdValue = (msg.value * ethPrice) / 1e18; // Convert ETH (18 decimals) to USD (6 decimals)
        _checkEligibility(msg.sender, usdValue);
        
        uint256 tokenAmount = _calculateTokenAmount(usdValue);
        
        _processPurchase(msg.sender, address(0), msg.value, usdValue, tokenAmount, referrer);
        
        // Transfer ETH to FundsVault
        fundsVault.depositETH{value: msg.value}();
    }
    
    /**
     * @notice Update round configuration (manager only)
     * @param _config New configuration
     */
    function updateConfig(RoundConfig memory _config) external onlyManager {
        require(_config.tokenPriceUSD > 0, "SaleRound: invalid price");
        require(_config.hardCapUSD > 0, "SaleRound: invalid hard cap");
        require(_config.endTime > _config.startTime, "SaleRound: invalid time range");
        require(_config.vestingDuration >= _config.cliffDuration, "SaleRound: invalid vesting");
        
        config = _config;
        emit ConfigUpdated(_config);
    }
    
    /**
     * @notice Update ETH/USD oracle address
     * @param _oracle New oracle address
     */
    function updateOracle(address _oracle) external onlyManager {
        require(_oracle != address(0), "SaleRound: zero address");
        ethUSDOracle = _oracle;
        emit OracleUpdated(_oracle);
    }
    
    /**
     * @notice Pause the sale round
     */
    function pause() external onlyManager {
        _pause();
    }
    
    /**
     * @notice Unpause the sale round
     */
    function unpause() external onlyManager {
        _unpause();
    }
    
    /**
     * @notice Get round information
     * @return RoundConfig struct
     */
    function getRoundInfo() external view returns (RoundConfig memory) {
        return config;
    }
    
    /**
     * @notice Get user allocation info
     * @param user Address to query
     * @return contribution Total USD contributed
     * @return allocation Total tokens allocated
     * @return bonus Total bonus tokens from referrals
     */
    function getUserInfo(address user) external view returns (
        uint256 contribution, 
        uint256 allocation,
        uint256 bonus
    ) {
        return (contributions[user], tokenAllocations[user], bonusTokens[user]);
    }
    
    /**
     * @notice Get referral info for user
     * @param user Address to query
     * @return referrer Address of referrer
     * @return hasReferrer Whether user has a referrer
     */
    function getReferralInfo(address user) external view returns (
        address referrer,
        bool hasReferrer
    ) {
        return (referralSystem.getReferrer(user), referralSystem.hasReferrer(user));
    }
    
    /**
     * @dev Check if user is eligible to participate
     * @param user Address to check
     * @param usdAmount USD amount being spent (6 decimals)
     */
    function _checkEligibility(address user, uint256 usdAmount) private {
        require(kycRegistry.isKYCApproved(user), "SaleRound: not KYC approved");
        rateLimiter.checkAndUpdateLimit(user, usdAmount);
    }
    
    /**
     * @dev Process a purchase
     */
    function _processPurchase(
        address buyer,
        address paymentToken,
        uint256 paymentAmount,
        uint256 usdValue,
        uint256 tokenAmount,
        address referrer
    ) private {
        require(totalRaisedUSD + usdValue <= config.hardCapUSD, "SaleRound: exceeds hard cap");
        
        contributions[buyer] += usdValue;
        tokenAllocations[buyer] += tokenAmount;
        totalRaisedUSD += usdValue;
        totalTokensSold += tokenAmount;
        
        // Handle referral bonus
        uint256 totalTokensToVest = tokenAmount;
        if (referrer != address(0) && referrer != buyer) {
            // Register referral if this is first purchase
            if (!referralSystem.hasReferrer(buyer)) {
                referralSystem.registerReferral(buyer, referrer);
            }
            
            // Calculate and distribute referral bonus
            (address actualReferrer, uint256 referrerBonus, uint256 refereeBonus) = 
                referralSystem.calculateReferralBonus(buyer, tokenAmount);
            
            if (actualReferrer != address(0)) {
                // Add bonus to allocations
                tokenAllocations[actualReferrer] += referrerBonus;
                bonusTokens[actualReferrer] += referrerBonus;
                bonusTokens[buyer] += refereeBonus;
                totalTokensSold += (referrerBonus + refereeBonus);
                
                // Update total tokens for referee
                totalTokensToVest += refereeBonus;
                
                // Create vesting for referrer bonus
                vestingVault.createVesting(
                    actualReferrer,
                    referrerBonus,
                    config.cliffDuration,
                    config.vestingDuration,
                    config.endTime
                );
                
                emit ReferralBonusDistributed(buyer, actualReferrer, referrerBonus, refereeBonus);
            }
        }
        
        // Create vesting schedule for buyer (includes referee bonus if applicable)
        uint256 vestingStart = config.endTime; // Vesting starts after round ends
        vestingVault.createVesting(
            buyer,
            totalTokensToVest,
            config.cliffDuration,
            config.vestingDuration,
            vestingStart
        );
        
        emit Purchase(buyer, paymentToken, paymentAmount, usdValue, tokenAmount);
    }
    
    /**
     * @dev Calculate token amount from USD value
     */
    function _calculateTokenAmount(uint256 usdValue) private view returns (uint256) {
        // tokenAmount = (usdValue * 10^18) / tokenPriceUSD
        // usdValue has 6 decimals, tokenPriceUSD has 6 decimals
        // Result should have 18 decimals (NEBA token decimals)
        return (usdValue * 1e18) / config.tokenPriceUSD;
    }
    
    /**
     * @dev Get ETH price from oracle
     * @return uint256 ETH price in USD with 6 decimals
     */
    function _getETHPrice() private view returns (uint256) {
        // In production, this would call a Chainlink oracle
        // For now, we'll use a simple interface
        (bool success, bytes memory data) = ethUSDOracle.staticcall(
            abi.encodeWithSignature("latestAnswer()")
        );
        require(success, "SaleRound: oracle call failed");
        
        int256 price = abi.decode(data, (int256));
        require(price > 0, "SaleRound: invalid price");
        
        // Chainlink ETH/USD has 8 decimals, we need 6
        return uint256(price) / 100;
    }
}

