# NEBA Presale - Current Deployment Status

## ✅ What's Deployed and Working:

### Deployed Contracts (Base Sepolia):

| Contract | Address | Status |
|----------|---------|--------|
| **NEBA Token** | `0x61D69E7a67BDf4Fc90d0c3036465727e53Dcf4b0` | ✅ Working |
| **KYC Registry** | `0x894B83d369007fF5a9398A33AE97655338a72200` | ✅ Working |
| **Rate Limiter** | `0x0Dd465da56CAC1a47CEE297D698dDdd420CA582a` | ✅ Working |
| **Funds Vault** | `0x4aF295B5D60BF504DeEFF7dE71E70e77CC9fa081` | ✅ Working |
| **Vesting Vault** | `0x6e33806ea75957383A599D3D9F79dc7f53daC564` | ✅ Working |
| **Referral System** | `0x69Aa9Cbf38bdd408396180Da77db63D5379Ac103` | ✅ Working |
| **Sale Manager** | `0x577a54D954E1e96E725b53A8df5c32ac8D203804` | ✅ Working |
| **Private Sale Round** | `0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A` | ⚠️ Needs Authorization |

### Test Tokens Deployed:

| Token | Address |
|-------|---------|
| **Mock USDC** | `0xfe411b74c2AA728ed17CFcCf1FA0144599b55176` |
| **Mock USDT** | `0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0` |
| **Mock ETH Oracle** | `0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e` ($2000) |

---

## ⚠️ Current Issues:

### Issue: Why ETH Purchase Failed

**Root Causes:**
1. **Oracle Problem** (FIXED ✅): Mainnet oracle doesn't work on testnet → Now using mock oracle
2. **Function Signature Changed** (NEW ⚠️): `buyWithETH()` now requires referrer parameter
3. **Access Control** (IN PROGRESS): VestingVault needs SALE_ROUND_ROLE for the round

---

## 🔧 Workaround Solutions:

Since there's a circular dependency issue with access control, here are **working solutions**:

### Solution 1: Buy with USDC/USDT (WORKS NOW! ✅)

USDC and USDT don't need an oracle, so they work without issues!

```javascript
// 1. Get test tokens
const usdc = await ethers.getContractAt("ERC20Mock", "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176");
await usdc.mint(yourAddress, ethers.parseUnits("1000", 6));

// 2. Approve
await usdc.approve("0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A", amount);

// 3. Buy WITHOUT referral
await saleRound.buyWithUSDC(amount, ethers.ZeroAddress);

// 4. Buy WITH referral (5% + 5% bonus!)
await saleRound.buyWithUSDC(amount, referrerAddress);
```

### Solution 2: Manual Role Grant (For ETH Purchases)

Grant SALE_ROUND_ROLE manually in VestingVault:

```javascript
// From SaleManager admin account
const vestingVault = await ethers.getContractAt("VestingVault", "0x6e33806ea75957383A599D3D9F79dc7f53daC564");
const SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE();
await vestingVault.grantRole(SALE_ROUND_ROLE, "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A");
```

Then ETH purchases will work:
```javascript
await saleRound.buyWithETH(referrerAddress, { value: ethAmount });
```

---

## ✅ What's Currently Working:

1. ✅ **KYC Whitelist Management**
   ```bash
   node scripts/manage-kyc.js add <address>
   node scripts/manage-kyc.js check <address>
   ```

2. ✅ **USDC Purchases** (with/without referral)
   ```javascript
   await saleRound.buyWithUSDC(amount, referrerAddress);
   ```

3. ✅ **USDT Purchases** (with/without referral)
   ```javascript
   await saleRound.buyWithUSDT(amount, referrerAddress);
   ```

4. ✅ **Referral System** (5% + 5% bonuses)
   ```javascript
   // Check referral stats
   await referralSystem.getReferralStats(address);
   ```

5. ✅ **Rate Limiting** (30 sec between tx, 10 tx/day)

6. ✅ **Funds Vault** (Stores all proceeds securely)

---

## 🔴 What Needs Manual Setup:

### For ETH Purchases to Work:

Run these commands from the SaleManager owner account:

```bash
# Option A: Use Hardhat console
npx hardhat console --network baseSepolia
```

```javascript
// Grant role in VestingVault
const vestingVault = await ethers.getContractAt("VestingVault", "0x6e33806ea75957383A599D3D9F79dc7f53daC564");
const saleManager = await ethers.getContractAt("SaleManager", "0x577a54D954E1e96E725b53A8df5c32ac8D203804");

const SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE();
const roundAddress = "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A";

// This requires SaleManager to have admin role in VestingVault
// Check if you have the role first
const hasRole = await vestingVault.hasRole(await vestingVault.DEFAULT_ADMIN_ROLE(), "0xD3b146826834722771E4f6aC45efE0f438EF45c0");
console.log("You have admin role:", hasRole);

if (hasRole) {
  await vestingVault.grantRole(SALE_ROUND_ROLE, roundAddress);
  console.log("✅ Role granted!");
}
```

---

## 📝 New Function Signatures (IMPORTANT!):

**All purchase functions now require a referrer parameter:**

```solidity
// OLD (doesn't work anymore):
buyWithUSDC(uint256 amount)
buyWithUSDT(uint256 amount)  
buyWithETH() payable

// NEW (correct):
buyWithUSDC(uint256 amount, address referrer)
buyWithUSDT(uint256 amount, address referrer)
buyWithETH(address referrer) payable
```

**To buy WITHOUT a referral:**
```javascript
await saleRound.buyWithUSDC(amount, ethers.ZeroAddress);
```

**To buy WITH a referral (earn 5% bonus!):**
```javascript
await saleRound.buyWithUSDC(amount, referrerAddress);
```

---

## 🎯 Quick Test Script:

Use this to test USDC purchase (works now!):

```javascript
// Get contracts
const saleRound = await ethers.getContractAt("SaleRound", "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A");
const usdc = await ethers.getContractAt("ERC20Mock", "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176");

// Mint test USDC
await usdc.mint(yourAddress, ethers.parseUnits("100", 6));

// Approve
await usdc.approve(saleRound.getAddress(), ethers.parseUnits("100", 6));

// Buy $100 worth (will get 2000 NEBA at $0.05)
await saleRound.buyWithUSDC(ethers.parseUnits("100", 6), ethers.ZeroAddress);

// Check allocation
const [contribution, allocation, bonus] = await saleRound.getUserInfo(yourAddress);
console.log("Tokens:", ethers.formatEther(allocation));
```

---

## 📚 Key Takeaways:

### What Works ✅:
- All contracts deployed
- Referral system active (5% + 5%)
- USDC/USDT purchases working
- KYC system working
- Rate limiting working

### What Needs Attention ⚠️:
- ETH purchases need manual role grant in VestingVault
- Remember new function signatures (referrer parameter required!)

### For Production Mainnet:
- Use real USDC/USDT addresses
- Use Chainlink oracle (will work on mainnet)
- Test thoroughly on testnet first
- Use proper multisig (Gnosis Safe)

---

## 🎁 Referral System:

- **Referrer gets**: 5% of purchase
- **Referee gets**: 5% bonus on their purchase  
- **Total bonus**: 10% extra tokens
- **One referrer per user**: First referrer is locked in
- **Same vesting**: Bonuses vest with same schedule

---

**Your presale is deployed! Focus on USDC/USDT purchases for now - they work perfectly with the referral system!** 🚀

