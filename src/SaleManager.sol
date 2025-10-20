// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SaleRound} from "./SaleRound.sol";
import {ReferralSystem} from "./ReferralSystem.sol";
import {VestingVault} from "./VestingVault.sol";

/**
 * @title SaleManager
 * @notice Orchestrates multiple sale rounds and manages overall presale
 * @dev Creates and manages SaleRound contracts
 */
contract SaleManager is Ownable {
    using SafeERC20 for IERC20;
    
    struct TimelockOperation {
        bytes32 operationId;
        address target;
        bytes data;
        uint256 executeTime;
        bool executed;
    }
    
    IERC20 public immutable nebaToken;
    address public immutable kycRegistry;
    address public immutable rateLimiter;
    address public immutable vestingVault;
    address public immutable fundsVault;
    address public immutable usdc;
    address public immutable usdt;
    address public immutable ethUSDOracle;
    ReferralSystem public immutable referralSystem;
    
    uint256 public timelockDelay = 2 days;
    
    SaleRound[] public rounds;
    mapping(bytes32 => TimelockOperation) public timelockOperations;
    
    event RoundCreated(address indexed roundAddress, uint256 indexed roundId, string name);
    event OperationScheduled(bytes32 indexed operationId, address indexed target, uint256 executeTime);
    event OperationExecuted(bytes32 indexed operationId);
    event OperationCancelled(bytes32 indexed operationId);
    event TimelockDelayUpdated(uint256 newDelay);
    
    /**
     * @dev Constructor sets up the sale manager
     */
    constructor(
        address _nebaToken,
        address _kycRegistry,
        address _rateLimiter,
        address _vestingVault,
        address _fundsVault,
        address _usdc,
        address _usdt,
        address _ethUSDOracle,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_nebaToken != address(0), "SaleManager: zero token");
        require(_kycRegistry != address(0), "SaleManager: zero kyc");
        require(_rateLimiter != address(0), "SaleManager: zero limiter");
        require(_vestingVault != address(0), "SaleManager: zero vesting");
        require(_fundsVault != address(0), "SaleManager: zero funds");
        require(_usdc != address(0), "SaleManager: zero usdc");
        require(_usdt != address(0), "SaleManager: zero usdt");
        require(_ethUSDOracle != address(0), "SaleManager: zero oracle");
        require(initialOwner != address(0), "SaleManager: zero owner");
        
        nebaToken = IERC20(_nebaToken);
        kycRegistry = _kycRegistry;
        rateLimiter = _rateLimiter;
        vestingVault = _vestingVault;
        fundsVault = _fundsVault;
        usdc = _usdc;
        usdt = _usdt;
        ethUSDOracle = _ethUSDOracle;
        
        // Deploy ReferralSystem with this contract as admin
        referralSystem = new ReferralSystem(address(this));
        
        // Also grant role to the initialOwner
        referralSystem.grantRole(referralSystem.DEFAULT_ADMIN_ROLE(), initialOwner);
        referralSystem.grantRole(referralSystem.REFERRAL_ADMIN_ROLE(), initialOwner);
    }
    
    /**
     * @notice Create a new sale round
     * @param config Round configuration
     * @return address Address of the created SaleRound contract
     */
    function createRound(SaleRound.RoundConfig memory config) external onlyOwner returns (address) {
        require(config.tokenPriceUSD > 0, "SaleManager: invalid price");
        require(config.hardCapUSD > 0, "SaleManager: invalid hard cap");
        require(config.endTime > config.startTime, "SaleManager: invalid time range");
        
        SaleRound round = new SaleRound(
            address(this),
            address(nebaToken),
            kycRegistry,
            rateLimiter,
            vestingVault,
            fundsVault,
            address(referralSystem),
            usdc,
            usdt,
            ethUSDOracle,
            config
        );
        
        rounds.push(round);
        
        emit RoundCreated(address(round), rounds.length - 1, config.name);
        return address(round);
    }
    
    /**
     * @notice Authorize a sale round after creation
     * @param roundIndex Index of the round to authorize
     */
    function authorizeSaleRound(uint256 roundIndex) external onlyOwner {
        require(roundIndex < rounds.length, "SaleManager: invalid index");
        address roundAddress = address(rounds[roundIndex]);
        
        // Grant SALE_ROUND_ROLE in ReferralSystem
        bytes32 REFERRAL_SALE_ROUND_ROLE = referralSystem.SALE_ROUND_ROLE();
        referralSystem.grantRole(REFERRAL_SALE_ROUND_ROLE, roundAddress);
        
        // Grant SALE_ROUND_ROLE in VestingVault
        VestingVault vesting = VestingVault(vestingVault);
        bytes32 VESTING_SALE_ROUND_ROLE = vesting.SALE_ROUND_ROLE();
        vesting.grantRole(VESTING_SALE_ROUND_ROLE, roundAddress);
    }
    
    /**
     * @notice Schedule a timelocked operation
     * @param target Target contract address
     * @param data Encoded function call data
     * @return bytes32 Operation ID
     */
    function scheduleOperation(address target, bytes memory data) external onlyOwner returns (bytes32) {
        require(target != address(0), "SaleManager: zero target");
        
        bytes32 operationId = keccak256(abi.encodePacked(target, data, block.timestamp));
        require(timelockOperations[operationId].executeTime == 0, "SaleManager: operation exists");
        
        uint256 executeTime = block.timestamp + timelockDelay;
        
        timelockOperations[operationId] = TimelockOperation({
            operationId: operationId,
            target: target,
            data: data,
            executeTime: executeTime,
            executed: false
        });
        
        emit OperationScheduled(operationId, target, executeTime);
        return operationId;
    }
    
    /**
     * @notice Execute a timelocked operation
     * @param operationId Operation identifier
     */
    function executeOperation(bytes32 operationId) external onlyOwner {
        TimelockOperation storage operation = timelockOperations[operationId];
        
        require(operation.executeTime != 0, "SaleManager: operation not found");
        require(!operation.executed, "SaleManager: already executed");
        require(block.timestamp >= operation.executeTime, "SaleManager: timelock not expired");
        
        operation.executed = true;
        
        (bool success, ) = operation.target.call(operation.data);
        require(success, "SaleManager: execution failed");
        
        emit OperationExecuted(operationId);
    }
    
    /**
     * @notice Cancel a pending timelocked operation
     * @param operationId Operation identifier
     */
    function cancelOperation(bytes32 operationId) external onlyOwner {
        TimelockOperation storage operation = timelockOperations[operationId];
        
        require(operation.executeTime != 0, "SaleManager: operation not found");
        require(!operation.executed, "SaleManager: already executed");
        
        delete timelockOperations[operationId];
        emit OperationCancelled(operationId);
    }
    
    /**
     * @notice Update timelock delay
     * @param newDelay New delay in seconds
     */
    function updateTimelockDelay(uint256 newDelay) external onlyOwner {
        require(newDelay >= 1 days, "SaleManager: delay too short");
        require(newDelay <= 7 days, "SaleManager: delay too long");
        
        timelockDelay = newDelay;
        emit TimelockDelayUpdated(newDelay);
    }
    
    /**
     * @notice Get total number of rounds
     * @return uint256 Number of rounds
     */
    function getRoundCount() external view returns (uint256) {
        return rounds.length;
    }
    
    /**
     * @notice Get round address by index
     * @param index Round index
     * @return address Round contract address
     */
    function getRound(uint256 index) external view returns (address) {
        require(index < rounds.length, "SaleManager: invalid index");
        return address(rounds[index]);
    }
    
    /**
     * @notice Get all round addresses
     * @return address[] Array of round addresses
     */
    function getAllRounds() external view returns (address[] memory) {
        address[] memory allRounds = new address[](rounds.length);
        for (uint256 i = 0; i < rounds.length; i++) {
            allRounds[i] = address(rounds[i]);
        }
        return allRounds;
    }
    
    /**
     * @notice Emergency pause a round
     * @param roundIndex Index of the round to pause
     */
    function pauseRound(uint256 roundIndex) external onlyOwner {
        require(roundIndex < rounds.length, "SaleManager: invalid index");
        rounds[roundIndex].pause();
    }
    
    /**
     * @notice Unpause a round
     * @param roundIndex Index of the round to unpause
     */
    function unpauseRound(uint256 roundIndex) external onlyOwner {
        require(roundIndex < rounds.length, "SaleManager: invalid index");
        rounds[roundIndex].unpause();
    }
}

