const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Diagnosing USDT Purchase Issue ===\n");

  const [user] = await hre.ethers.getSigners();
  const userAddress = user.address;
  
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const roundAddress = "0xf77fbffed698008edD790fCfDb6ea3F95610Cc96";
  const usdtAddress = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
  const kycRegistryAddress = deployment.contracts.KYCRegistry;
  const vestingVaultAddress = deployment.contracts.VestingVault;
  const referralSystemAddress = deployment.contracts.ReferralSystem;
  
  console.log("User:", userAddress);
  console.log("Round:", roundAddress);
  console.log("USDT:", usdtAddress, "\n");
  
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const usdt = await hre.ethers.getContractAt("ERC20Mock", usdtAddress);
  const kycRegistry = await hre.ethers.getContractAt("KYCRegistry", kycRegistryAddress);
  const vestingVault = await hre.ethers.getContractAt("VestingVault", vestingVaultAddress);
  const referralSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystemAddress);
  
  console.log("═══════════════════════════════════════");
  console.log("  DIAGNOSTIC CHECKS");
  console.log("═══════════════════════════════════════\n");
  
  // Check 1: KYC
  console.log("1️⃣ KYC Status:");
  const isKYCApproved = await kycRegistry.isKYCApproved(userAddress);
  console.log("   User KYC approved:", isKYCApproved ? "✅" : "❌ ISSUE!");
  if (!isKYCApproved) {
    console.log("   Fix: node scripts/manage-kyc.js add " + userAddress);
  }
  
  // Check 2: USDT Balance
  console.log("\n2️⃣ USDT Balance:");
  const usdtBalance = await usdt.balanceOf(userAddress);
  console.log("   Balance:", ethers.formatUnits(usdtBalance, 6), "USDT");
  if (usdtBalance === 0n) {
    console.log("   ❌ ISSUE: No USDT!");
    console.log("   Fix: await usdt.mint(yourAddress, ethers.parseUnits('1000', 6))");
  }
  
  // Check 3: USDT Allowance
  console.log("\n3️⃣ USDT Allowance:");
  const allowance = await usdt.allowance(userAddress, roundAddress);
  console.log("   Allowance:", ethers.formatUnits(allowance, 6), "USDT");
  if (allowance === 0n) {
    console.log("   ❌ ISSUE: No approval!");
    console.log("   Fix: await usdt.approve(roundAddress, amount)");
  }
  
  // Check 4: Round is Paused
  console.log("\n4️⃣ Round Status:");
  const isPaused = await saleRound.paused();
  const config = await saleRound.config();
  console.log("   Round paused:", isPaused ? "❌ ISSUE!" : "✅");
  console.log("   Round active:", config.isActive ? "✅" : "❌ ISSUE!");
  
  // Check 5: VestingVault Role
  console.log("\n5️⃣ VestingVault Access:");
  const SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE();
  const hasVestingRole = await vestingVault.hasRole(SALE_ROUND_ROLE, roundAddress);
  console.log("   Round has SALE_ROUND_ROLE:", hasVestingRole ? "✅" : "❌ ISSUE!");
  if (!hasVestingRole) {
    console.log("   This is likely the problem!");
    console.log("   Fix: Grant role manually (see below)");
  }
  
  // Check 6: ReferralSystem Role
  console.log("\n6️⃣ ReferralSystem Access:");
  const REFERRAL_ROLE = await referralSystem.SALE_ROUND_ROLE();
  const hasReferralRole = await referralSystem.hasRole(REFERRAL_ROLE, roundAddress);
  console.log("   Round has SALE_ROUND_ROLE:", hasReferralRole ? "✅" : "❌ ISSUE!");
  
  // Check 7: Rate Limiter
  console.log("\n7️⃣ Rate Limiter:");
  const rateLimiter = await hre.ethers.getContractAt("RateLimiter", deployment.contracts.RateLimiter);
  const RATE_LIMITER_ROLE = await rateLimiter.SALE_ROUND_ROLE();
  const hasRateLimiterRole = await rateLimiter.hasRole(RATE_LIMITER_ROLE, roundAddress);
  console.log("   Round has SALE_ROUND_ROLE:", hasRateLimiterRole ? "✅" : "❌ ISSUE!");
  
  // Summary
  console.log("\n═══════════════════════════════════════");
  console.log("  DIAGNOSIS SUMMARY");
  console.log("═══════════════════════════════════════\n");
  
  if (!isKYCApproved) {
    console.log("❌ ISSUE: Not KYC approved");
    console.log("   Fix: node scripts/manage-kyc.js add " + userAddress + "\n");
  }
  
  if (!hasVestingRole) {
    console.log("❌ ISSUE: VestingVault role not granted (MOST LIKELY CAUSE!)");
    console.log("   Fix using Hardhat console:");
    console.log("   ────────────────────────────────────");
    console.log("   const vestingVault = await ethers.getContractAt('VestingVault', '" + vestingVaultAddress + "')");
    console.log("   const SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE()");
    console.log("   await vestingVault.grantRole(SALE_ROUND_ROLE, '" + roundAddress + "')");
    console.log("   ────────────────────────────────────\n");
  }
  
  if (!hasReferralRole) {
    console.log("⚠️  WARNING: ReferralSystem role not granted");
    console.log("   Referral bonuses won't work until fixed.\n");
  }
  
  if (isKYCApproved && hasVestingRole && hasReferralRole && hasRateLimiterRole) {
    console.log("✅ All checks passed!");
    console.log("\nIf purchase still fails, the issue might be:");
    console.log("1. Function signature: Must include referrer parameter");
    console.log("   buyWithUSDT(amount, referrerAddress)");
    console.log("2. Not enough USDT balance");
    console.log("3. Not enough approval");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

