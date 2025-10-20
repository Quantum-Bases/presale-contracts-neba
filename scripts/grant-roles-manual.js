const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Manually Granting Roles to Sale Round ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const vestingVaultAddress = deployment.contracts.VestingVault;
  const referralSystemAddress = deployment.contracts.ReferralSystem;
  const roundAddress = "0xeF80035e5A9FB1Db98B7a14cAb0C25d89447B52A";
  
  console.log("Vesting Vault:", vestingVaultAddress);
  console.log("Referral System:", referralSystemAddress);
  console.log("Sale Round:", roundAddress);
  console.log("Your Account:", deployer.address, "\n");
  
  // Grant role in VestingVault
  console.log("1️⃣ Granting SALE_ROUND_ROLE in VestingVault...");
  const vestingVault = await hre.ethers.getContractAt("VestingVault", vestingVaultAddress);
  const VESTING_ROLE = await vestingVault.SALE_ROUND_ROLE();
  const tx1 = await vestingVault.grantRole(VESTING_ROLE, roundAddress);
  await tx1.wait();
  console.log("   ✅ Role granted! Tx:", tx1.hash, "\n");
  
  // Grant role in ReferralSystem
  console.log("2️⃣ Granting SALE_ROUND_ROLE in ReferralSystem...");
  const referralSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystemAddress);
  const REFERRAL_ROLE = await referralSystem.SALE_ROUND_ROLE();
  const tx2 = await referralSystem.grantRole(REFERRAL_ROLE, roundAddress);
  await tx2.wait();
  console.log("   ✅ Role granted! Tx:", tx2.hash, "\n");
  
  console.log("🎉 Sale Round Fully Authorized!");
  console.log("\n✅ Round can now:");
  console.log("   - Create vesting schedules");
  console.log("   - Process referral bonuses");
  console.log("   - Accept purchases (USDC/USDT/ETH)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

