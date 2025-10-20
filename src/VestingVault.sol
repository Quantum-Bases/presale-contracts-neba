// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VestingVault
 * @notice Manages token vesting with cliff and linear unlock schedules
 * @dev Handles multiple vesting schedules per beneficiary
 */
contract VestingVault is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;
    
    bytes32 public constant SALE_ROUND_ROLE = keccak256("SALE_ROUND_ROLE");
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 startTime;
        uint256 cliffEnd;
        uint256 vestingEnd;
    }
    
    IERC20 public immutable token;
    address public saleManager;
    bool private _initialized;
    
    // beneficiary => vesting schedules array
    mapping(address => VestingSchedule[]) private _vestingSchedules;
    
    event VestingCreated(
        address indexed beneficiary,
        uint256 indexed scheduleId,
        uint256 amount,
        uint256 cliffEnd,
        uint256 vestingEnd
    );
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event SaleRoundAuthorized(address indexed saleRound);
    
    modifier onlyAuthorized() {
        require(
            msg.sender == saleManager || hasRole(SALE_ROUND_ROLE, msg.sender),
            "VestingVault: not authorized"
        );
        _;
    }
    
    /**
     * @dev Constructor sets the token only
     * @param _token NEBA token address
     */
    constructor(address _token) {
        require(_token != address(0), "VestingVault: zero token address");
        token = IERC20(_token);
        // Grant admin role to deployer initially
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @notice Initialize the vesting vault with sale manager (one-time only)
     * @param _saleManager SaleManager contract address
     */
    function initialize(address _saleManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!_initialized, "VestingVault: already initialized");
        require(_saleManager != address(0), "VestingVault: zero manager address");
        
        saleManager = _saleManager;
        _initialized = true;
        
        // Grant admin role to sale manager so it can authorize rounds
        _grantRole(DEFAULT_ADMIN_ROLE, _saleManager);
        
        emit SaleRoundAuthorized(_saleManager);
    }
    
    /**
     * @notice Create a vesting schedule for a beneficiary
     * @param beneficiary Address that will receive vested tokens
     * @param amount Total amount of tokens to vest
     * @param cliffDuration Cliff period in seconds
     * @param vestingDuration Total vesting duration in seconds (including cliff)
     * @param startTime Vesting start timestamp
     */
    function createVesting(
        address beneficiary,
        uint256 amount,
        uint256 cliffDuration,
        uint256 vestingDuration,
        uint256 startTime
    ) external onlyAuthorized {
        require(beneficiary != address(0), "VestingVault: zero address");
        require(amount > 0, "VestingVault: zero amount");
        require(vestingDuration > 0, "VestingVault: zero duration");
        require(cliffDuration <= vestingDuration, "VestingVault: cliff > duration");
        require(startTime >= block.timestamp, "VestingVault: invalid start time");
        
        uint256 cliffEnd = startTime + cliffDuration;
        uint256 vestingEnd = startTime + vestingDuration;
        
        VestingSchedule memory schedule = VestingSchedule({
            totalAmount: amount,
            claimedAmount: 0,
            startTime: startTime,
            cliffEnd: cliffEnd,
            vestingEnd: vestingEnd
        });
        
        _vestingSchedules[beneficiary].push(schedule);
        
        emit VestingCreated(
            beneficiary,
            _vestingSchedules[beneficiary].length - 1,
            amount,
            cliffEnd,
            vestingEnd
        );
    }
    
    /**
     * @notice Claim all vested tokens for the caller
     */
    function claimVested() external nonReentrant {
        uint256 claimable = getClaimableAmount(msg.sender);
        require(claimable > 0, "VestingVault: nothing to claim");
        
        VestingSchedule[] storage schedules = _vestingSchedules[msg.sender];
        
        for (uint256 i = 0; i < schedules.length; i++) {
            VestingSchedule storage schedule = schedules[i];
            
            if (block.timestamp < schedule.cliffEnd) {
                continue;
            }
            
            uint256 vested = _calculateVestedAmount(schedule);
            uint256 unclaimed = vested - schedule.claimedAmount;
            
            if (unclaimed > 0) {
                schedule.claimedAmount += unclaimed;
            }
        }
        
        token.safeTransfer(msg.sender, claimable);
        emit TokensClaimed(msg.sender, claimable);
    }
    
    /**
     * @notice Get total vested amount for a beneficiary
     * @param beneficiary Address to check
     * @return uint256 Total vested amount
     */
    function getVestedAmount(address beneficiary) external view returns (uint256) {
        VestingSchedule[] memory schedules = _vestingSchedules[beneficiary];
        uint256 totalVested = 0;
        
        for (uint256 i = 0; i < schedules.length; i++) {
            if (block.timestamp >= schedules[i].cliffEnd) {
                totalVested += _calculateVestedAmount(schedules[i]);
            }
        }
        
        return totalVested;
    }
    
    /**
     * @notice Get claimable amount for a beneficiary
     * @param beneficiary Address to check
     * @return uint256 Claimable amount
     */
    function getClaimableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule[] memory schedules = _vestingSchedules[beneficiary];
        uint256 totalClaimable = 0;
        
        for (uint256 i = 0; i < schedules.length; i++) {
            VestingSchedule memory schedule = schedules[i];
            
            if (block.timestamp < schedule.cliffEnd) {
                continue;
            }
            
            uint256 vested = _calculateVestedAmount(schedule);
            uint256 unclaimed = vested - schedule.claimedAmount;
            totalClaimable += unclaimed;
        }
        
        return totalClaimable;
    }
    
    /**
     * @notice Get number of vesting schedules for a beneficiary
     * @param beneficiary Address to check
     * @return uint256 Number of schedules
     */
    function getVestingScheduleCount(address beneficiary) external view returns (uint256) {
        return _vestingSchedules[beneficiary].length;
    }
    
    /**
     * @notice Get vesting schedule details
     * @param beneficiary Address to check
     * @param index Schedule index
     * @return schedule VestingSchedule struct
     */
    function getVestingSchedule(address beneficiary, uint256 index) 
        external 
        view 
        returns (VestingSchedule memory schedule) 
    {
        require(index < _vestingSchedules[beneficiary].length, "VestingVault: invalid index");
        return _vestingSchedules[beneficiary][index];
    }
    
    /**
     * @dev Calculate vested amount for a schedule
     * @param schedule VestingSchedule to calculate
     * @return uint256 Vested amount
     */
    function _calculateVestedAmount(VestingSchedule memory schedule) private view returns (uint256) {
        if (block.timestamp < schedule.cliffEnd) {
            return 0;
        }
        
        if (block.timestamp >= schedule.vestingEnd) {
            return schedule.totalAmount;
        }
        
        uint256 vestingDuration = schedule.vestingEnd - schedule.startTime;
        uint256 timeVested = block.timestamp - schedule.startTime;
        
        return (schedule.totalAmount * timeVested) / vestingDuration;
    }
}

