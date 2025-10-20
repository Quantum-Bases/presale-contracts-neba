# 🚀 Your NEBA Presale is Ready - Start Here!

## ✅ Current Status:

**ALL CONTRACTS DEPLOYED TO BASE SEPOLIA TESTNET!**

---

## 📋 Deployed Addresses:

```
Private Sale Round:  0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A
Sale Manager:        0x577a54D954E1e96E725b53A8df5c32ac8D203804
Referral System:     0x69Aa9Cbf38bdd408396180Da77db63D5379Ac103
Vesting Vault:       0x6e33806ea75957383A599D3D9F79dc7f53daC564
Funds Vault:         0x4aF295B5D60BF504DeEFF7dE71E70e77CC9fa081
KYC Registry:        0x894B83d369007fF5a9398A33AE97655338a72200
Rate Limiter:        0x0Dd465da56CAC1a47CEE297D698dDdd420CA582a

Test Tokens:
Mock USDC:           0xfe411b74c2AA728ed17CFcCf1FA0144599b55176  
Mock USDT:           0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0
Mock ETH Oracle:     0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e
```

---

## ⚠️ IMPORTANT: Function Signature Changed!

**The buyWithETH/USDC/USDT functions now require a referrer parameter!**

```javascript
// ❌ OLD (will fail):
buyWithUSDC(amount)
buyWithETH({ value: amount })

// ✅ NEW (correct):
buyWithUSDC(amount, referrerAddress)
buyWithETH(referrerAddress, { value: amount })

// ✅ No referral? Use zero address:
buyWithUSDC(amount, ethers.ZeroAddress)
```

---

## 🎯 How to Test Buying Right Now:

### Quick Test Script (Copy & Paste):

```javascript
// 1. Open Hardhat console
// npx hardhat console --network baseSepolia

// 2. Setup
const saleRound = await ethers.getContractAt("SaleRound", "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A");
const usdc = await ethers.getContractAt("ERC20Mock", "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176");
const [buyer] = await ethers.getSigners();

// 3. Mint test USDC
await usdc.mint(buyer.address, ethers.parseUnits("1000", 6));
console.log("✅ Minted 1000 USDC");

// 4. Approve
await usdc.approve(await saleRound.getAddress(), ethers.parseUnits("100", 6));
console.log("✅ Approved");

// 5. Buy $100 worth (no referral)
await saleRound.buyWithUSDC(ethers.parseUnits("100", 6), ethers.ZeroAddress);
console.log("✅ Purchase complete!");

// 6. Check your allocation
const [contribution, allocation, bonus] = await saleRound.getUserInfo(buyer.address);
console.log("You got:", ethers.formatEther(allocation), "NEBA tokens");
console.log("Bonus:", ethers.formatEther(bonus), "NEBA");
```

---

## 🎁 Testing Referral System:

### Scenario: Alice Refers Bob

```javascript
// Alice's address (referrer)
const alice = "0xAliceAddress";

// Bob buys with Alice's referral
await saleRound.connect(bob).buyWithUSDC(
  ethers.parseUnits("1000", 6),  // $1000
  alice                          // Alice's referral code
);

// Results:
// Bob gets: 21,000 NEBA (20,000 base + 1,000 referee bonus)
// Alice gets: 1,000 NEBA (referrer bonus)
// Total: 22,000 NEBA distributed (10% bonus!)

// Check allocations
const [, bobAllocation, bobBonus] = await saleRound.getUserInfo(bob.address);
const [, aliceAllocation, aliceBonus] = await saleRound.getUserInfo(alice);

console.log("Bob's tokens:", ethers.formatEther(bobAllocation));
console.log("Bob's bonus:", ethers.formatEther(bobBonus));
console.log("Alice's bonus:", ethers.formatEther(aliceBonus));
```

---

## 📝 KYC Management:

```bash
# Add single address
node scripts/manage-kyc.js add 0xUserAddress

# Batch add
node scripts/manage-kyc.js batch-add 0xAddr1,0xAddr2,0xAddr3

# Check status
node scripts/manage-kyc.js check 0xUserAddress
```

---

## 🔍 View on Basescan:

- **Private Sale Round**: https://sepolia.basescan.org/address/0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A
- **Referral System**: https://sepolia.basescan.org/address/0x69Aa9Cbf38bdd408396180Da77db63D5379Ac103  
- **Mock USDC**: https://sepolia.basescan.org/address/0xfe411b74c2AA728ed17CFcCf1FA0144599b55176

---

## ✅ What's Working:

- ✅ USDC purchases with/without referral
- ✅ USDT purchases with/without referral  
- ✅ Referral system (5% + 5% = 10% bonus)
- ✅ KYC whitelist
- ✅ Rate limiting
- ✅ Vesting system
- ✅ Funds vault

## ⚠️ Known Issues:

- ⚠️ ETH purchases need manual VestingVault role setup (use USDC/USDT instead!)
- ⚠️ Must use new function signature with referrer parameter

---

## 🎯 Next Steps:

1. **Test USDC Purchase** (use script above)
2. **Test Referral System** (have someone refer you or vice versa)
3. **Add More Users to KYC** (use manage-kyc.js script)
4. **Monitor Funds Vault** (all proceeds go here)
5. **Check Vesting Schedules** (tokens vest over 12 months with 6-month cliff)

---

## 💡 Pro Tips:

1. **Always include referrer parameter** - even if you pass `ethers.ZeroAddress`
2. **For testing, use USDC/USDT** - they're simpler and work immediately  
3. **Check your allocation** after each purchase to verify bonuses
4. **Share your referral code** to earn 5% on every referred purchase!

---

**Your presale is live and working! Start testing with USDC purchases.** 🚀

For detailed documentation, see:
- `HOW_TO_BUY.md` - Detailed purchase guide
- `DEPLOYMENT_STATUS.md` - Current deployment status
- `REFERRAL_SYSTEM.md` - Referral system documentation

