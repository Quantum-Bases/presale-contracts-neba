const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Granting KYC_MANAGER_ROLE ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const kycRegistryAddress = deployment.contracts.KYCRegistry;
  const targetAddress = "0xD3b146826834722771E4f6aC45efE0f438EF45c0";
  
  console.log("KYC Registry:", kycRegistryAddress);
  console.log("Target Address:", targetAddress);
  console.log("Your Account:", deployer.address, "\n");
  
  const kycRegistry = await hre.ethers.getContractAt("KYCRegistry", kycRegistryAddress);
  
  // Get role hash
  const KYC_MANAGER_ROLE = await kycRegistry.KYC_MANAGER_ROLE();
  console.log("KYC_MANAGER_ROLE:", KYC_MANAGER_ROLE, "\n");
  
  // Check current roles
  const DEFAULT_ADMIN_ROLE = await kycRegistry.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await kycRegistry.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const alreadyHasKYCRole = await kycRegistry.hasRole(KYC_MANAGER_ROLE, targetAddress);
  
  console.log("Checking permissions:");
  console.log("  You have DEFAULT_ADMIN_ROLE:", hasAdminRole ? "✅" : "❌");
  console.log("  Target already has KYC_MANAGER_ROLE:", alreadyHasKYCRole ? "✅" : "❌");
  
  if (!hasAdminRole) {
    console.error("\n❌ Error: You don't have permission to grant roles!");
    console.error("Only accounts with DEFAULT_ADMIN_ROLE can grant other roles.");
    process.exit(1);
  }
  
  if (alreadyHasKYCRole) {
    console.log("\n✅ Target address already has KYC_MANAGER_ROLE!");
    process.exit(0);
  }
  
  // Grant role
  console.log("\nGranting KYC_MANAGER_ROLE to", targetAddress, "...");
  const tx = await kycRegistry.grantRole(KYC_MANAGER_ROLE, targetAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Transaction confirmed!\n");
  
  // Verify
  const hasRoleNow = await kycRegistry.hasRole(KYC_MANAGER_ROLE, targetAddress);
  console.log("Verification:");
  console.log("  Target has KYC_MANAGER_ROLE:", hasRoleNow ? "✅" : "❌");
  
  if (hasRoleNow) {
    console.log("\n🎉 KYC_MANAGER_ROLE successfully granted!");
    console.log("\nThe address can now:");
    console.log("  - Add users to whitelist");
    console.log("  - Remove users from whitelist");
    console.log("  - Batch add/remove users");
    console.log("\nUsage:");
    console.log("  await kycRegistry.addToWhitelist(userAddress);");
    console.log("  await kycRegistry.batchAddToWhitelist([addr1, addr2, ...]);");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

