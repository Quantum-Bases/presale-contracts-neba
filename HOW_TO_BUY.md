# How to Buy NEBA Tokens - Complete Guide

## 🎯 Private Sale Round is LIVE!

**Round Address**: `0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A`  
**Network**: Base Sepolia Testnet  
**Price**: $0.05 per NEBA  
**Hard Cap**: $500,000  

---

## 💰 Three Ways to Buy:

### Option 1: Buy with USDC ✅ (Recommended for Testing)

```javascript
// Step 1: Get contracts
const saleRound = await ethers.getContractAt(
  "SaleRound", 
  "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A"
);
const usdc = await ethers.getContractAt(
  "ERC20Mock", 
  "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176"
);

// Step 2: Mint test USDC (only on testnet!)
await usdc.mint(yourAddress, ethers.parseUnits("1000", 6)); // 1000 USDC

// Step 3: Approve
await usdc.approve(
  await saleRound.getAddress(), 
  ethers.parseUnits("100", 6)
);

// Step 4: Buy WITHOUT referral
await saleRound.buyWithUSDC(
  ethers.parseUnits("100", 6),  // $100
  ethers.ZeroAddress            // No referral
);

// OR Buy WITH referral (get 5% bonus!)
await saleRound.buyWithUSDC(
  ethers.parseUnits("100", 6),     // $100
  "0xReferrerAddressHere"          // Referrer address
);
```

**Result**:
- Without referral: 2,000 NEBA ($100 / $0.05)
- With referral: 2,100 NEBA (2,000 + 5% bonus)
- Referrer earns: 100 NEBA (5% of purchase)

### Option 2: Buy with USDT ✅

```javascript
const usdt = await ethers.getContractAt(
  "ERC20Mock", 
  "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0"
);

// Mint, approve, then buy
await usdt.mint(yourAddress, ethers.parseUnits("100", 6));
await usdt.approve(saleRound.getAddress(), ethers.parseUnits("100", 6));
await saleRound.buyWithUSDT(
  ethers.parseUnits("100", 6),
  referrerAddress  // or ethers.ZeroAddress for no referral
);
```

### Option 3: Buy with ETH ⚠️ (Needs Setup)

```javascript
// ⚠️ Requires SALE_ROUND_ROLE in VestingVault first!
await saleRound.buyWithETH(
  referrerAddress,  // or ethers.ZeroAddress
  { value: ethers.parseEther("0.01") }  // 0.01 ETH
);
```

**Note**: ETH purchases currently need manual role setup. Use USDC/USDT instead for testing!

---

## 🎁 Referral System Usage:

### As a Buyer (Referee):

1. Get a referral address from someone
2. Use it when purchasing:
```javascript
await saleRound.buyWithUSDC(amount, referrerAddress);
```
3. You get **5% extra tokens**!

### As a Referrer:

1. Share your address with others
2. When they buy using your address, you get **5% of their purchase**
3. Track your earnings:
```javascript
const referralSystem = await ethers.getContractAt(
  "ReferralSystem",
  "0x69Aa9Cbf38bdd408396180Da77db63D5379Ac103"
);

const stats = await referralSystem.getReferralStats(yourAddress);
console.log("People you referred:", stats.totalReferred.toString());
console.log("Bonus earned:", ethers.formatEther(stats.totalBonusEarned), "NEBA");
```

---

## 📊 Check Your Allocation:

```javascript
const saleRound = await ethers.getContractAt(
  "SaleRound",
  "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A"
);

const [contribution, allocation, bonus] = await saleRound.getUserInfo(yourAddress);

console.log("Total Contributed: $" + ethers.formatUnits(contribution, 6));
console.log("Total NEBA Tokens:", ethers.formatEther(allocation));
console.log("Referral Bonus:", ethers.formatEther(bonus));
```

---

## 🔑 Important Notes:

### Function Signature Changed! ⚠️

**All purchase functions NOW require a referrer parameter!**

```javascript
// ❌ WRONG (old way - will fail!):
await saleRound.buyWithUSDC(amount);
await saleRound.buyWithETH({ value: amount });

// ✅ CORRECT (new way):
await saleRound.buyWithUSDC(amount, referrerAddress);
await saleRound.buyWithETH(referrerAddress, { value: amount });

// ✅ No referral? Use zero address:
await saleRound.buyWithUSDC(amount, ethers.ZeroAddress);
await saleRound.buyWithETH(ethers.ZeroAddress, { value: amount });
```

### Referral Rules:

- ✅ Can only be referred once (first referrer is locked in)
- ❌ Cannot refer yourself
- ✅ No limit on how many people you can refer
- ✅ Bonuses vest with same schedule as purchase

---

## 🚀 Complete Purchase Example:

```javascript
// Setup
const saleRound = await ethers.getContractAt("SaleRound", "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A");
const usdc = await ethers.getContractAt("ERC20Mock", "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176");
const referrerAddress = "0xSomeoneWhoReferredYou"; // Or ethers.ZeroAddress

// Mint test USDC (testnet only)
await usdc.mint(yourAddress, ethers.parseUnits("500", 6));

// Approve spending
await usdc.approve(await saleRound.getAddress(), ethers.parseUnits("500", 6));

// Purchase $500 worth
await saleRound.buyWithUSDC(
  ethers.parseUnits("500", 6),
  referrerAddress
);

// Expected result:
// - You pay: $500
// - Base tokens: 10,000 NEBA ($500 / $0.05)
// - Your bonus: 500 NEBA (5% referee bonus)
// - Referrer bonus: 500 NEBA (5% referrer bonus)
// - Your total: 10,500 NEBA
// - Referrer total: 500 NEBA
```

---

## 📋 Pre-Purchase Checklist:

Before buying, ensure:
- ✅ You have test USDC/USDT (mint it!)
- ✅ You are KYC approved
- ✅ Round is active
- ✅ You've approved token spending
- ✅ You're using the correct function signature (with referrer param!)

---

## 🐛 Troubleshooting:

### "Not KYC approved"
```bash
node scripts/manage-kyc.js add YOUR_ADDRESS
```

### "Rate limit exceeded"
Wait 30 seconds between purchases.

### "Wrong function signature" / "Missing argument"
Remember to include referrer parameter (use `ethers.ZeroAddress` if no referral).

### "Insufficient allowance"
Approve more tokens:
```javascript
await usdc.approve(saleRound.getAddress(), amount);
```

---

## 📞 Quick Reference:

```
Private Sale Round: 0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A
Mock USDC: 0xfe411b74c2AA728ed17CFcCf1FA0144599b55176
Mock USDT: 0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0
Referral System: 0x69Aa9Cbf38bdd408396180Da77db63D5379Ac103
```

---

**Start testing with USDC purchases - they work perfectly with the referral system!** 🎉

