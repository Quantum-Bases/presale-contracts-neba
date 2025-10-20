const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Authorizing Round Using SaleManager Function ===\n");

  const [admin] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const saleManagerAddress = deployment.contracts.SaleManager;
  const roundIndex = 0; // Private Sale
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Round Index:", roundIndex);
  console.log("Admin:", admin.address, "\n");
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  // Get round address
  const roundAddress = await saleManager.getRound(roundIndex);
  console.log("Round Address:", roundAddress, "\n");
  
  // Check if authorizeSaleRound function exists
  console.log("Calling saleManager.authorizeSaleRound(" + roundIndex + ")...");
  
  try {
    const tx = await saleManager.authorizeSaleRound(roundIndex);
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Authorization complete!\n");
    
    // Verify
    const vestingVault = await hre.ethers.getContractAt("VestingVault", deployment.contracts.VestingVault);
    const referralSystem = await hre.ethers.getContractAt("ReferralSystem", deployment.contracts.ReferralSystem);
    
    const VESTING_ROLE = await vestingVault.SALE_ROUND_ROLE();
    const REFERRAL_ROLE = await referralSystem.SALE_ROUND_ROLE();
    
    const hasVestingRole = await vestingVault.hasRole(VESTING_ROLE, roundAddress);
    const hasReferralRole = await referralSystem.hasRole(REFERRAL_ROLE, roundAddress);
    
    console.log("Verification:");
    console.log("  VestingVault SALE_ROUND_ROLE:", hasVestingRole ? "✅" : "❌");
    console.log("  ReferralSystem SALE_ROUND_ROLE:", hasReferralRole ? "✅" : "❌");
    
    if (hasVestingRole && hasReferralRole) {
      console.log("\n🎉 Round fully authorized! Purchases will now work!");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("\nThe authorizeSaleRound function might not work due to access control.");
    console.log("Let me try a different approach...");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

