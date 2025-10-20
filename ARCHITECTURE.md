# NEBA Presale System Architecture

## System Overview

The NEBA Presale system is a modular, secure token sale platform built for the Base network. It supports multiple sale rounds, multi-currency payments, and sophisticated vesting mechanisms.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         User Layer                              │
│  (Buyers interact with SaleRound contracts after KYC approval)  │
└─────────────────────────┬──────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────────┐
│                    SaleManager Contract                         │
│  - Creates and manages multiple sale rounds                     │
│  - Implements timelock for admin operations                     │
│  - Coordinates system components                                │
└──┬─────────────────┬─────────────────┬────────────────────────┬┘
   │                 │                 │                        │
   ▼                 ▼                 ▼                        ▼
┌────────┐    ┌────────────┐   ┌────────────┐         ┌──────────┐
│ Round  │    │   Round    │   │   Round    │         │  Round   │
│Private │    │ Community  │   │ Strategic  │   ...   │  Public  │
└───┬────┘    └─────┬──────┘   └─────┬──────┘         └─────┬────┘
    │               │                │                      │
    └───────────────┴────────────────┴──────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬──────────────┐
        │                 │                 │              │
        ▼                 ▼                 ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐
│ FundsVault   │  │VestingVault  │  │KYCRegistry  │  │  Rate    │
│              │  │              │  │             │  │ Limiter  │
│ Stores:      │  │ Manages:     │  │ Validates:  │  │          │
│ - ETH        │  │ - Cliff      │  │ - Whitelist │  │ Prevents │
│ - USDC       │  │ - Vesting    │  │ - KYC       │  │ - Bots   │
│ - USDT       │  │ - Claims     │  │   approval  │  │ - Spam   │
└──────────────┘  └──────┬───────┘  └─────────────┘  └──────────┘
                         │
                         ▼
                 ┌───────────────┐
                 │  NEBA Token   │
                 │  (ERC20)      │
                 └───────────────┘
```

## Core Components

### 1. NEBAToken

**Purpose**: ERC20 token contract for $NEBA

**Key Features**:
- Standard ERC20 implementation
- Controlled minting by owner
- Max supply: 1 billion tokens
- 18 decimals

**Access Control**:
- Owner can mint (initially deployer, transferred to multisig)

**State Variables**:
```solidity
uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
```

### 2. SaleManager

**Purpose**: Orchestrates the entire presale system

**Responsibilities**:
- Create and manage sale rounds
- Implement timelock mechanism
- Coordinate system components
- Emergency controls (pause/unpause)

**Key Functions**:
```solidity
createRound(RoundConfig memory config) → address
scheduleOperation(address target, bytes memory data) → bytes32
executeOperation(bytes32 operationId)
pauseRound(uint256 roundIndex)
```

**Timelock Flow**:
```
1. scheduleOperation() → Creates operation with future execution time
2. Wait timelockDelay (2 days)
3. executeOperation() → Executes the operation
```

### 3. SaleRound

**Purpose**: Handles individual presale round logic

**Responsibilities**:
- Accept payments (USDC, USDT, ETH)
- Calculate token allocations
- Enforce round parameters
- Create vesting schedules
- Transfer funds to FundsVault

**Purchase Flow**:
```
1. User calls buyWithUSDC/USDT/ETH()
2. Check KYC approval (via KYCRegistry)
3. Check rate limits (via RateLimiter)
4. Validate purchase (round active, under hard cap)
5. Calculate token amount from USD value
6. Transfer payment to FundsVault
7. Create vesting schedule in VestingVault
8. Update user allocation
9. Emit Purchase event
```

**Configuration Parameters**:
```solidity
struct RoundConfig {
    string name;              // "Private Sale"
    uint256 tokenPriceUSD;    // Price in USD (6 decimals)
    uint256 hardCapUSD;       // Max raise in USD (6 decimals)
    uint256 startTime;        // Unix timestamp
    uint256 endTime;          // Unix timestamp
    uint256 cliffDuration;    // Cliff in seconds
    uint256 vestingDuration;  // Total vesting in seconds
    bool isActive;            // Can participate?
}
```

### 4. VestingVault

**Purpose**: Manages token vesting with cliff and linear unlock

**Vesting Model**:
```
Cliff Period     │  Linear Vesting
─────────────────┴──────────────────────
0% unlocked      │  Gradual unlock to 100%
```

**Vesting Schedule**:
```solidity
struct VestingSchedule {
    uint256 totalAmount;      // Total tokens to vest
    uint256 claimedAmount;    // Already claimed
    uint256 startTime;        // Vesting start
    uint256 cliffEnd;         // When cliff ends
    uint256 vestingEnd;       // When fully vested
}
```

**Calculation Logic**:
```solidity
if (currentTime < cliffEnd) return 0;
if (currentTime >= vestingEnd) return totalAmount;

vestedAmount = (totalAmount * timeElapsed) / vestingDuration;
claimableAmount = vestedAmount - claimedAmount;
```

**Example**:
- 10,000 tokens
- 6-month cliff (180 days)
- 12-month total vesting (365 days)

```
Month 0-6: 0 tokens claimable
Month 7: ~1,640 tokens claimable (6/12 of total)
Month 12: 10,000 tokens claimable (fully vested)
```

### 5. FundsVault

**Purpose**: Secure storage for presale proceeds

**Features**:
- Stores ETH, USDC, USDT
- Only authorized depositors can deposit
- Only multisig can withdraw
- Reentrancy protected

**Authorization Flow**:
```
1. Multisig calls authorizeDepositor(saleRoundAddress)
2. SaleRound can now deposit funds
3. When user purchases, funds automatically deposited
4. Multisig can withdraw at any time
```

### 6. KYCRegistry

**Purpose**: Whitelist management for compliance

**Features**:
- Role-based access (KYC_MANAGER_ROLE)
- Single and batch operations
- Revocable approvals

**Integration**:
```solidity
// In SaleRound
require(kycRegistry.isKYCApproved(msg.sender), "Not approved");
```

### 7. RateLimiter

**Purpose**: Prevent bot attacks and spam

**Rate Limiting Strategy**:
```
Per Address:
- Minimum 30 seconds between transactions
- Maximum 10 transactions per 24-hour period
- Resets after period expires
```

**State Tracking**:
```solidity
struct RateLimit {
    uint256 lastTransactionTime;
    uint256 transactionCount;
    uint256 periodStart;
}
```

## Data Flow

### Purchase Flow (Detailed)

```
┌──────┐
│ User │
└──┬───┘
   │ 1. buyWithUSDC(1000 USDC)
   ▼
┌────────────┐
│ SaleRound  │
└──┬─────────┘
   │ 2. isKYCApproved(user)?
   ▼
┌─────────────┐
│KYCRegistry  │ → ✓ Approved
└─────────────┘
   │ 3. checkAndUpdateLimit(user)?
   ▼
┌─────────────┐
│RateLimiter  │ → ✓ Within limits
└─────────────┘
   │ 4. Calculate tokens: $1000 / $0.05 = 20,000 NEBA
   │ 5. Transfer 1000 USDC from user
   ▼
┌─────────────┐
│ FundsVault  │ ← Receive 1000 USDC
└─────────────┘
   │ 6. Create vesting: 20,000 NEBA, 6mo cliff, 12mo vest
   ▼
┌──────────────┐
│VestingVault  │ ← Store vesting schedule
└──────────────┘
   │ 7. Update user allocation
   │ 8. Emit Purchase event
   ▼
┌──────┐
│ User │ → 20,000 NEBA allocated (vesting starts after round)
└──────┘
```

### Vesting & Claim Flow

```
Round Ends → Vesting Starts
│
├─ Month 0-6: Cliff period (0% claimable)
│
├─ Month 7: Cliff ends
│   └─ User calls claimVested()
│       └─ Receives ~50% of tokens
│
├─ Month 9: 
│   └─ User calls claimVested()
│       └─ Receives additional ~25%
│
└─ Month 12: Fully vested
    └─ User calls claimVested()
        └─ Receives remaining 25%
```

## Price Oracle Integration

### ETH Price Feed

Uses Chainlink oracle for ETH/USD conversion:

```solidity
// Get ETH price
(bool success, bytes memory data) = ethUSDOracle.staticcall(
    abi.encodeWithSignature("latestAnswer()")
);
int256 price = abi.decode(data, (int256));

// Convert: ETH (18 decimals) → USD (6 decimals)
uint256 usdValue = (ethAmount * ethPrice) / 1e18;
```

**Chainlink ETH/USD Oracle on Base**:
- Address: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`
- Decimals: 8
- Updates: ~1 hour or 0.5% price deviation

## Security Layers

### 1. Access Control Hierarchy

```
                    ┌─────────────┐
                    │  Multisig   │
                    │  (Top Level)│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
  ┌──────────┐      ┌──────────┐      ┌──────────┐
  │  Token   │      │  Funds   │      │   KYC    │
  │  Owner   │      │  Vault   │      │ Manager  │
  └──────────┘      └──────────┘      └──────────┘
```

### 2. Checks-Effects-Interactions Pattern

```solidity
function buyWithUSDC(uint256 amount) external {
    // CHECKS
    require(roundActive, "Not active");
    require(kycApproved, "Not KYC");
    require(amount > 0, "Zero amount");
    
    // EFFECTS
    totalRaised += amount;
    userAllocation[msg.sender] += tokens;
    
    // INTERACTIONS
    usdc.transferFrom(msg.sender, address(this));
    fundsVault.deposit(amount);
}
```

### 3. Reentrancy Guards

All external calls protected:
```solidity
function claimVested() external nonReentrant {
    // Calculate claimable
    // Update state
    // Transfer tokens
}
```

## Gas Optimization

### Batch Operations

KYCRegistry supports batch operations:
```solidity
// Single: ~50k gas per address
addToWhitelist(address)

// Batch: ~30k gas per address
batchAddToWhitelist(address[])
```

### Storage Optimization

- Use immutable variables where possible
- Pack structs efficiently
- Minimize storage writes

### Example: Efficient Storage

```solidity
// BAD: Multiple storage slots
uint256 public startTime;
uint256 public endTime;
bool public isActive;

// GOOD: Single storage slot
struct Config {
    uint128 startTime;  // Enough for timestamps until year 2106
    uint128 endTime;
    bool isActive;
}
```

## Scalability

### Unlimited Rounds

SaleManager can create unlimited rounds:
```solidity
SaleRound[] public rounds;  // Dynamic array

function createRound(...) external {
    SaleRound newRound = new SaleRound(...);
    rounds.push(newRound);
}
```

### Multiple Vesting Schedules

Each user can have multiple vesting schedules:
```solidity
mapping(address => VestingSchedule[]) private _vestingSchedules;
```

This allows:
- Participating in multiple rounds
- Different vesting terms per round
- Flexible token distribution

## Upgrade Strategy

### Non-Upgradeable Design

Contracts are immutable by design for security, but configurable:

**What CAN be changed**:
- Round parameters (via timelock)
- Rate limit settings
- KYC whitelist
- Pause states

**What CANNOT be changed**:
- Contract logic
- Token addresses
- Vault addresses
- Core security mechanisms

### Migration Path

If critical bug found:
1. Pause affected contracts
2. Deploy new contracts
3. Migrate state if necessary
4. Update frontend to use new addresses

## Frontend Integration

### Recommended Architecture

```
┌─────────────┐
│   React     │
│  Frontend   │
└──────┬──────┘
       │
       ├─ ethers.js / viem
       │
       ▼
┌──────────────┐
│   Wallet     │
│ (MetaMask/WC)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Base Network  │
│  Contracts   │
└──────────────┘
```

### Key Integrations

1. **Wallet Connection**: WalletConnect, MetaMask
2. **Contract Interaction**: ethers.js or viem
3. **Event Monitoring**: WebSocket or polling
4. **Price Feeds**: Display real-time ETH price
5. **Vesting Tracking**: Show claimable amounts

## Monitoring & Analytics

### Events to Monitor

```solidity
// SaleRound
event Purchase(address buyer, address token, uint256 amount, ...);

// VestingVault
event VestingCreated(address beneficiary, uint256 amount, ...);
event TokensClaimed(address beneficiary, uint256 amount);

// FundsVault
event ETHDeposited(address from, uint256 amount);
event TokenWithdrawn(address token, address to, uint256 amount);
```

### Metrics to Track

- Total raised per round
- Number of participants
- Average contribution size
- Vesting schedules created
- Claim rate
- Rate limit triggers

## Testing Strategy

### Unit Tests

Each contract has comprehensive unit tests:
- All functions
- Edge cases
- Error conditions
- Access control

### Integration Tests

Test interactions between contracts:
- Full purchase flow
- Vesting creation and claiming
- Rate limiting across purchases
- Timelock operations

### Fuzzing

Use Foundry fuzzing for:
- Token amount calculations
- Vesting calculations
- Rate limit logic

```solidity
function testFuzz_TokenCalculation(uint256 usdAmount) public {
    // Test with random USD amounts
}
```

## Deployment Order

Critical for circular dependencies:

1. **NEBAToken** (no dependencies)
2. **KYCRegistry** (no dependencies)
3. **RateLimiter** (no dependencies)
4. **FundsVault** (no dependencies)
5. **SaleManager** (needs all except VestingVault)
6. **VestingVault** (needs Token + SaleManager)
7. **Redeploy SaleManager** with correct VestingVault
8. **Create SaleRounds** via SaleManager

See `DEPLOYMENT_GUIDE.md` for detailed steps.

## Future Enhancements

Potential improvements (require new contracts):

1. **Referral System**: Track and reward referrals
2. **Dynamic Pricing**: Price adjusts based on demand
3. **Multi-Token Vesting**: Vest multiple tokens simultaneously
4. **Governance Integration**: DAO control of parameters
5. **Advanced Analytics**: On-chain metrics and tracking

---

This architecture provides a secure, scalable, and maintainable presale system suitable for production use on Base network.

