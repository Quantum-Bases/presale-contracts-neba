# Referral System Documentation

## Overview

The NEBA Presale includes a built-in referral system that rewards both referrers and referees with bonus tokens.

### Bonus Structure:
- **Referrer Bonus**: 5% of purchase amount
- **Referee Bonus**: 5% of purchase amount  
- **Total Bonus**: 10% additional tokens distributed

## How It Works

### 1. User Makes Purchase with Referral Code

When a user purchases tokens, they can provide a referrer address:

```solidity
// Purchase with USDC and referral
await saleRound.buyWithUSDC(amount, referrerAddress);

// Purchase with USDT and referral
await saleRound.buyWithUSDT(amount, referrerAddress);

// Purchase with ETH and referral
await saleRound.buyWithETH(referrerAddress, { value: ethAmount });
```

### 2. Automatic Bonus Calculation

When a valid referrer is provided:
- System checks if user already has a referrer
- If first purchase, registers the referral relationship
- Calculates 5% bonus for referrer
- Calculates 5% bonus for referee (buyer)
- Distributes bonuses automatically

### 3. Example:

**Scenario**: Alice refers Bob

1. **Bob buys 1,000 NEBA tokens** using Alice's referral address
2. **Alice receives**: 50 NEBA (5% referrer bonus)
3. **Bob receives**: 1,050 NEBA (1,000 purchase + 50 referee bonus)
4. **Total distributed**: 1,100 NEBA tokens

## Smart Contract Architecture

### ReferralSystem Contract

Located at: `src/ReferralSystem.sol`

**Key Functions:**

```solidity
// Register a referral (called by SaleRound)
function registerReferral(address referee, address referrer)

// Calculate referral bonus (called by SaleRound)
function calculateReferralBonus(address referee, uint256 tokenAmount)
  returns (address referrer, uint256 referrerBonus, uint256 refereeBonus)

// Check if user has referrer
function hasReferrer(address referee) returns (bool)

// Get referrer address
function getReferrer(address referee) returns (address)

// Get referral statistics
function getReferralStats(address user) 
  returns (address referrer, uint256 totalReferred, uint256 totalBonusEarned, bool hasReferred)
```

**Admin Functions:**

```solidity
// Update bonus percentages (max 10% each, 20% total)
function updateBonusPercentages(uint256 referrerBps, uint256 refereeBps)
```

## Frontend Integration

### Purchase with Referral

```javascript
// ethers.js v6 example
const saleRound = await ethers.getContractAt("SaleRound", roundAddress);

// Get referrer from URL parameter or input
const referrerAddress = new URLSearchParams(window.location.search).get('ref') || '0x0000000000000000000000000000000000000000';

// Approve USDC
const usdc = await ethers.getContractAt("IERC20", usdcAddress);
await usdc.approve(roundAddress, amount);

// Purchase with referral
await saleRound.buyWithUSDC(amount, referrerAddress);
```

### Generate Referral Link

```javascript
// User's referral link
const referralLink = `https://presale.neba.io?ref=${userAddress}`;

// Share link
navigator.clipboard.writeText(referralLink);
```

### Check Referral Stats

```javascript
// Get user's referral statistics
const stats = await referralSystem.getReferralStats(userAddress);

console.log("Referrer:", stats.referrer);
console.log("Total Referred:", stats.totalReferred.toString());
console.log("Total Bonus Earned:", ethers.formatEther(stats.totalBonusEarned));
console.log("Has Referrer:", stats.hasReferred);

// Get list of referred users
const referredUsers = await referralSystem.getReferredUsers(userAddress);
console.log("Referred Users:", referredUsers);

// Check user's bonus tokens in sale round
const [contribution, allocation, bonus] = await saleRound.getUserInfo(userAddress);
console.log("Bonus Tokens:", ethers.formatEther(bonus));
```

## Purchase Flow with Referral

```
1. User visits presale with referral link
   └─> URL: presale.neba.io?ref=0x123...

2. Frontend extracts referrer address
   └─> referrerAddress = 0x123...

3. User makes purchase
   └─> buyWithUSDC(amount, referrerAddress)

4. SaleRound processes:
   ├─> Check if user has existing referrer
   ├─> If first purchase: Register referral
   ├─> Calculate bonuses (5% + 5%)
   ├─> Add bonus to referrer's allocation
   ├─> Add bonus to referee's allocation
   ├─> Create vesting schedules
   └─> Emit ReferralBonusDistributed event

5. Tokens distributed:
   ├─> Referee: Purchase amount + 5% bonus
   └─> Referrer: 5% of referee's purchase
```

## Events

### ReferralRegistered
```solidity
event ReferralRegistered(address indexed referee, address indexed referrer);
```
Emitted when a referral relationship is created.

### ReferralBonusDistributed
```solidity
event ReferralBonusDistributed(
    address indexed referee,
    address indexed referrer,
    uint256 referrerBonus,
    uint256 refereeBonus
);
```
Emitted when referral bonuses are calculated and distributed.

## Security Features

### 1. One Referrer Per User
- Users can only be referred once
- First referrer is locked in
- Prevents gaming the system

### 2. Self-Referral Prevention
```solidity
require(referee != referrer, "ReferralSystem: self-referral");
```

### 3. Role-Based Access
- Only SaleRound contracts can register referrals
- Only admins can update bonus percentages
- Max bonus limits enforced (10% each, 20% total)

### 4. Bonus Limits
```solidity
// Max 10% per bonus type
require(_referrerBps <= 1000, "ReferralSystem: referrer bonus too high");
require(_refereeBps <= 1000, "ReferralSystem: referee bonus too high");

// Max 20% total bonus
require(_referrerBps + _refereeBps <= 2000, "ReferralSystem: total bonus too high");
```

## Vesting

**All referral bonuses are subject to the same vesting schedule as the purchase:**
- Cliff period: Same as round configuration
- Vesting duration: Same as round configuration
- Start time: After round ends

Example:
- Round has 6-month cliff, 12-month vesting
- Referral bonuses also vest over 12 months with 6-month cliff

## Admin Management

### Update Bonus Percentages

```javascript
// From multisig wallet
const referralSystem = await ethers.getContractAt("ReferralSystem", referralAddress);

// Update to 3% referrer, 7% referee (basis points: 300 = 3%, 700 = 7%)
await referralSystem.updateBonusPercentages(300, 700);
```

### Grant Roles

```javascript
// Grant REFERRAL_ADMIN_ROLE
const REFERRAL_ADMIN_ROLE = await referralSystem.REFERRAL_ADMIN_ROLE();
await referralSystem.grantRole(REFERRAL_ADMIN_ROLE, adminAddress);

// Grant SALE_ROUND_ROLE (done automatically by SaleManager)
const SALE_ROUND_ROLE = await referralSystem.SALE_ROUND_ROLE();
await referralSystem.grantRole(SALE_ROUND_ROLE, saleRoundAddress);
```

## Monitoring & Analytics

### Track Referral Activity

```javascript
// Total referrals in system
const totalReferrals = await referralSystem.totalReferrals();

// Total bonus distributed
const totalBonus = await referralSystem.totalBonusDistributed();

// Top referrers (off-chain indexing recommended)
// Listen to ReferralBonusDistributed events
const filter = referralSystem.filters.ReferralBonusDistributed();
const events = await referralSystem.queryFilter(filter);
```

### Dashboard Metrics

Display on your presale dashboard:
- Total referrals made
- Total bonus earned
- List of referred users
- Pending vested bonuses
- Claimable bonus tokens

## Example UI Components

### Referral Stats Widget

```jsx
function ReferralStats({ userAddress }) {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    async function loadStats() {
      const data = await referralSystem.getReferralStats(userAddress);
      setStats(data);
    }
    loadStats();
  }, [userAddress]);
  
  return (
    <div className="referral-stats">
      <h3>Your Referral Stats</h3>
      <p>Total Referred: {stats?.totalReferred.toString()}</p>
      <p>Bonus Earned: {ethers.formatEther(stats?.totalBonusEarned)} NEBA</p>
      <p>Referral Link: 
        <input value={`https://presale.neba.io?ref=${userAddress}`} readOnly />
      </p>
    </div>
  );
}
```

## Testing

### Test Referral Flow

```javascript
describe("Referral System", () => {
  it("Should distribute referral bonuses correctly", async () => {
    const [alice, bob] = await ethers.getSigners();
    
    // Alice refers Bob
    const amount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.connect(bob).approve(saleRound.address, amount);
    await saleRound.connect(bob).buyWithUSDC(amount, alice.address);
    
    // Check bonuses
    const [, aliceAllocation, aliceBonus] = await saleRound.getUserInfo(alice.address);
    const [, bobAllocation, bobBonus] = await saleRound.getUserInfo(bob.address);
    
    // Calculate expected tokens (1000 USDC / $0.05 = 20,000 NEBA)
    const baseTokens = ethers.parseEther("20000");
    const referrerBonus = baseTokens * 5n / 100n; // 5%
    const refereeBonus = baseTokens * 5n / 100n; // 5%
    
    expect(aliceBonus).to.equal(referrerBonus);
    expect(bobBonus).to.equal(refereeBonus);
    expect(bobAllocation).to.equal(baseTokens + refereeBonus);
  });
});
```

## FAQs

**Q: Can I change my referrer after first purchase?**
A: No, the referrer is locked in on first purchase.

**Q: Do I need to use a referral code?**
A: No, it's optional. Use `address(0)` if no referrer.

**Q: When can I claim referral bonuses?**
A: Bonuses vest with the same schedule as the purchase, claimable after cliff period.

**Q: Is there a limit on referrals?**
A: No limit on how many people you can refer.

**Q: Can I refer myself?**
A: No, self-referrals are blocked.

---

**Contract Addresses:**
- ReferralSystem: [Deployed by SaleManager]
- Integrated in all SaleRound contracts

**Support:**
- Documentation: `/docs/referral`
- API: `/api/referrals`
- Help: support@neba.io

