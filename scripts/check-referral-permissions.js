const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const saleManagerAddress = deployment.contracts.SaleManager;
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  const referralSystemAddress = await saleManager.referralSystem();
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Referral System:", referralSystemAddress);
  console.log("Your Account:", deployer.address, "\n");
  
  const referralSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystemAddress);
  
  // Check roles
  const DEFAULT_ADMIN_ROLE = await referralSystem.DEFAULT_ADMIN_ROLE();
  const REFERRAL_ADMIN_ROLE = await referralSystem.REFERRAL_ADMIN_ROLE();
  
  console.log("Checking Referral System Roles:");
  const hasDefaultAdmin = await referralSystem.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const hasReferralAdmin = await referralSystem.hasRole(REFERRAL_ADMIN_ROLE, deployer.address);
  const saleManagerHasAdmin = await referralSystem.hasRole(DEFAULT_ADMIN_ROLE, saleManagerAddress);
  
  console.log("  Your account has DEFAULT_ADMIN_ROLE:", hasDefaultAdmin ? "✅" : "❌");
  console.log("  Your account has REFERRAL_ADMIN_ROLE:", hasReferralAdmin ? "✅" : "❌");
  console.log("  SaleManager has DEFAULT_ADMIN_ROLE:", saleManagerHasAdmin ? "✅" : "❌");
  
  if (!saleManagerHasAdmin) {
    console.log("\n⚠️ Issue Found: SaleManager doesn't have admin role in ReferralSystem!");
    console.log("\nTo fix, run:");
    console.log(`  await referralSystem.grantRole(DEFAULT_ADMIN_ROLE, "${saleManagerAddress}")`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

