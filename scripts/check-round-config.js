const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Checking SaleRound Configuration ===\n");

  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const roundAddress = "0xf77fbffed698008edD790fCfDb6ea3F95610Cc96";
  
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  
  // Get all addresses from the round
  console.log("SaleRound Internal Addresses:");
  console.log("─────────────────────────────────────");
  const manager = await saleRound.manager();
  const nebaToken = await saleRound.nebaToken();
  const kycRegistry = await saleRound.kycRegistry();
  const rateLimiter = await saleRound.rateLimiter();
  const vestingVault = await saleRound.vestingVault();
  const fundsVault = await saleRound.fundsVault();
  const referralSystem = await saleRound.referralSystem();
  const usdc = await saleRound.usdc();
  const usdt = await saleRound.usdt();
  
  console.log("Manager:", manager);
  console.log("NEBA Token:", nebaToken);
  console.log("KYC Registry:", kycRegistry);
  console.log("Rate Limiter:", rateLimiter);
  console.log("Vesting Vault:", vestingVault);
  console.log("Funds Vault:", fundsVault);
  console.log("Referral System:", referralSystem);
  console.log("USDC:", usdc);
  console.log("USDT:", usdt);
  console.log("─────────────────────────────────────\n");
  
  console.log("Deployment File Addresses:");
  console.log("─────────────────────────────────────");
  console.log("Vesting Vault:", deployment.contracts.VestingVault);
  console.log("Referral System:", deployment.contracts.ReferralSystem);
  console.log("─────────────────────────────────────\n");
  
  // Check if they match
  const vestingMatch = vestingVault.toLowerCase() === deployment.contracts.VestingVault.toLowerCase();
  const referralMatch = referralSystem.toLowerCase() === deployment.contracts.ReferralSystem.toLowerCase();
  
  console.log("Address Matching:");
  console.log("  VestingVault matches:", vestingMatch ? "✅" : "❌ MISMATCH!");
  console.log("  ReferralSystem matches:", referralMatch ? "✅" : "❌ MISMATCH!");
  
  if (!vestingMatch) {
    console.log("\n❌ PROBLEM: SaleRound is using different VestingVault!");
    console.log("   SaleRound uses:", vestingVault);
    console.log("   We granted roles to:", deployment.contracts.VestingVault);
    console.log("\n   We need to grant roles to the CORRECT VestingVault that SaleRound uses!");
  }
  
  if (!referralMatch) {
    console.log("\n❌ PROBLEM: SaleRound is using different ReferralSystem!");
    console.log("   SaleRound uses:", referralSystem);
    console.log("   We granted roles to:", deployment.contracts.ReferralSystem);
  }
  
  // If mismatch, show fix
  if (!vestingMatch || !referralMatch) {
    console.log("\n🔧 FIX: Grant roles to the CORRECT addresses:");
    if (!vestingMatch) {
      console.log("\n   const vestingVault = await ethers.getContractAt('VestingVault', '" + vestingVault + "')");
      console.log("   const SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE()");
      console.log("   await vestingVault.grantRole(SALE_ROUND_ROLE, '" + roundAddress + "')");
    }
    if (!referralMatch) {
      console.log("\n   const referralSystem = await ethers.getContractAt('ReferralSystem', '" + referralSystem + "')");
      console.log("   const SALE_ROUND_ROLE = await referralSystem.SALE_ROUND_ROLE()");
      console.log("   await referralSystem.grantRole(SALE_ROUND_ROLE, '" + roundAddress + "')");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

