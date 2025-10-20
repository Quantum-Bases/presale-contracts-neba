const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Verifying Round Roles ===\n");

  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const roundAddress = "0xf77fbffed698008edD790fCfDb6ea3F95610Cc96";
  const vestingVaultAddress = deployment.contracts.VestingVault;
  const referralSystemAddress = deployment.contracts.ReferralSystem;
  const rateLimiterAddress = deployment.contracts.RateLimiter;
  const fundsVaultAddress = deployment.contracts.FundsVault;
  
  console.log("Round:", roundAddress);
  console.log("Vesting Vault:", vestingVaultAddress);
  console.log("Referral System:", referralSystemAddress, "\n");
  
  const vestingVault = await hre.ethers.getContractAt("VestingVault", vestingVaultAddress);
  const referralSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystemAddress);
  const rateLimiter = await hre.ethers.getContractAt("RateLimiter", rateLimiterAddress);
  const fundsVault = await hre.ethers.getContractAt("FundsVault", fundsVaultAddress);
  
  // Check all roles
  console.log("Checking Roles:");
  console.log("─────────────────────────────────────");
  
  const VESTING_SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE();
  const hasVestingRole = await vestingVault.hasRole(VESTING_SALE_ROUND_ROLE, roundAddress);
  console.log("1. VestingVault SALE_ROUND_ROLE:", hasVestingRole ? "✅" : "❌");
  
  const REFERRAL_SALE_ROUND_ROLE = await referralSystem.SALE_ROUND_ROLE();
  const hasReferralRole = await referralSystem.hasRole(REFERRAL_SALE_ROUND_ROLE, roundAddress);
  console.log("2. ReferralSystem SALE_ROUND_ROLE:", hasReferralRole ? "✅" : "❌");
  
  const RATE_LIMITER_ROLE = await rateLimiter.SALE_ROUND_ROLE();
  const hasRateLimiterRole = await rateLimiter.hasRole(RATE_LIMITER_ROLE, roundAddress);
  console.log("3. RateLimiter SALE_ROUND_ROLE:", hasRateLimiterRole ? "✅" : "❌");
  
  const isAuthorized = await fundsVault.authorizedDepositors(roundAddress);
  console.log("4. FundsVault Authorized Depositor:", isAuthorized ? "✅" : "❌");
  
  console.log("─────────────────────────────────────\n");
  
  // Check round config
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const config = await saleRound.config();
  const isPaused = await saleRound.paused();
  
  console.log("Round Configuration:");
  console.log("  Active:", config.isActive ? "✅" : "❌");
  console.log("  Paused:", isPaused ? "❌ PAUSED!" : "✅ Not paused");
  console.log("  Start Time:", new Date(Number(config.startTime) * 1000).toLocaleString());
  console.log("  Current Time:", new Date().toLocaleString());
  console.log("  Has Started:", Date.now() / 1000 >= Number(config.startTime) ? "✅" : "❌");
  
  // Try to call the function directly to get revert reason
  console.log("\nTrying test call to get revert reason...");
  try {
    await saleRound.buyWithUSDT.staticCall(
      hre.ethers.parseUnits("100", 6),
      hre.ethers.ZeroAddress
    );
    console.log("✅ Test call succeeded - purchase should work!");
  } catch (error) {
    console.log("❌ Test call failed!");
    console.log("Revert reason:", error.message);
    
    // Parse common errors
    if (error.message.includes("not KYC approved")) {
      console.log("\n💡 Issue: Not KYC approved");
    } else if (error.message.includes("not authorized")) {
      console.log("\n💡 Issue: Missing SALE_ROUND_ROLE");
    } else if (error.message.includes("too frequent")) {
      console.log("\n💡 Issue: Rate limit - wait 30 seconds");
    } else if (error.message.includes("paused")) {
      console.log("\n💡 Issue: Round is paused");
    } else if (error.message.includes("allowance")) {
      console.log("\n💡 Issue: Insufficient USDT allowance");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

