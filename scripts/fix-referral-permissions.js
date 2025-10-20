const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Fixing Referral System Permissions ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const saleManagerAddress = deployment.contracts.SaleManager;
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  const referralSystemAddress = await saleManager.referralSystem();
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Referral System:", referralSystemAddress);
  console.log("Your Account:", deployer.address, "\n");
  
  const referralSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystemAddress);
  
  // Grant DEFAULT_ADMIN_ROLE to SaleManager
  const DEFAULT_ADMIN_ROLE = await referralSystem.DEFAULT_ADMIN_ROLE();
  
  console.log("Granting DEFAULT_ADMIN_ROLE to SaleManager...");
  const tx = await referralSystem.grantRole(DEFAULT_ADMIN_ROLE, saleManagerAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Role granted!\n");
  
  // Verify
  const hasRole = await referralSystem.hasRole(DEFAULT_ADMIN_ROLE, saleManagerAddress);
  console.log("Verification:");
  console.log("  SaleManager has DEFAULT_ADMIN_ROLE:", hasRole ? "✅" : "❌");
  
  if (hasRole) {
    console.log("\n🎉 Permissions fixed! You can now create rounds.");
    console.log("\nNext step: Run");
    console.log("  npx hardhat run scripts/create-private-sale.js --network baseSepolia");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

