const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Fixing All Permissions for Sale Round ===\n");

  const [admin] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const vestingVaultAddress = deployment.contracts.VestingVault;
  const referralSystemAddress = deployment.contracts.ReferralSystem;
  const saleManagerAddress = deployment.contracts.SaleManager;
  const roundAddress = "0x3C32ab6dbb0567b77cBd379E983F04693a55f300";
  
  console.log("Admin Account:", admin.address);
  console.log("Sale Round:", roundAddress, "\n");
  
  // Get contracts
  const vestingVault = await hre.ethers.getContractAt("VestingVault", vestingVaultAddress);
  const referralSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystemAddress);
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  // Check if SaleManager has admin role in VestingVault
  console.log("Checking SaleManager permissions in VestingVault...");
  const DEFAULT_ADMIN_ROLE = await vestingVault.DEFAULT_ADMIN_ROLE();
  const saleManagerHasAdmin = await vestingVault.hasRole(DEFAULT_ADMIN_ROLE, saleManagerAddress);
  console.log("  SaleManager has admin role:", saleManagerHasAdmin ? "✅" : "❌");
  
  if (!saleManagerHasAdmin) {
    console.log("  Granting admin role to SaleManager...");
    const tx0 = await vestingVault.grantRole(DEFAULT_ADMIN_ROLE, saleManagerAddress);
    await tx0.wait();
    console.log("  ✅ Admin role granted to SaleManager\n");
  }
  
  // 1. Grant SALE_ROUND_ROLE in VestingVault
  console.log("1️⃣ Granting SALE_ROUND_ROLE in VestingVault...");
  const VESTING_SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE();
  
  // Check if admin or saleManager can grant
  const adminHasRole = await vestingVault.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
  console.log("   Your account has admin role:", adminHasRole ? "✅" : "❌");
  
  if (adminHasRole) {
    const tx1 = await vestingVault.grantRole(VESTING_SALE_ROUND_ROLE, roundAddress);
    await tx1.wait();
    console.log("   ✅ Role granted! Tx:", tx1.hash, "\n");
  } else {
    console.log("   ❌ Cannot grant - no admin permission!\n");
  }
  
  // 2. Grant SALE_ROUND_ROLE in ReferralSystem
  console.log("2️⃣ Granting SALE_ROUND_ROLE in ReferralSystem...");
  const REFERRAL_SALE_ROUND_ROLE = await referralSystem.SALE_ROUND_ROLE();
  const tx2 = await referralSystem.grantRole(REFERRAL_SALE_ROUND_ROLE, roundAddress);
  await tx2.wait();
  console.log("   ✅ Role granted! Tx:", tx2.hash, "\n");
  
  // Verify all roles
  console.log("═══════════════════════════════════════");
  console.log("  VERIFICATION");
  console.log("═══════════════════════════════════════\n");
  
  const hasVestingRole = await vestingVault.hasRole(VESTING_SALE_ROUND_ROLE, roundAddress);
  const hasReferralRole = await referralSystem.hasRole(REFERRAL_SALE_ROUND_ROLE, roundAddress);
  
  console.log("VestingVault SALE_ROUND_ROLE:", hasVestingRole ? "✅" : "❌");
  console.log("ReferralSystem SALE_ROUND_ROLE:", hasReferralRole ? "✅" : "❌");
  
  if (hasVestingRole && hasReferralRole) {
    console.log("\n🎉 All permissions fixed!");
    console.log("\nYou can now purchase with USDT:");
    console.log("  1. await usdt.approve(roundAddress, amount)");
    console.log("  2. await saleRound.buyWithUSDT(amount, referrerAddress)");
    console.log("\nRemember: referrerAddress parameter is REQUIRED!");
    console.log("  - With referral: use actual address");
    console.log("  - Without referral: use ethers.ZeroAddress");
  } else {
    console.log("\n⚠️  Some roles still missing - check errors above");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });

