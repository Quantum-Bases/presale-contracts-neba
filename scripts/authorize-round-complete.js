const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Complete Round Authorization ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const saleManagerAddress = deployment.contracts.SaleManager;
  const roundIndex = 0; // Private Sale round
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Your Account:", deployer.address, "\n");
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  // Call the new authorizeSaleRound function
  console.log(`Authorizing round ${roundIndex}...`);
  const tx = await saleManager.authorizeSaleRound(roundIndex);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Round fully authorized!\n");
  
  // Get round address
  const roundAddress = await saleManager.getRound(roundIndex);
  console.log("Round Address:", roundAddress);
  console.log("\n🎉 Round is now fully operational!");
  console.log("\nUsers can now:");
  console.log("  - Purchase with USDC/USDT/ETH");
  console.log("  - Use referral codes");
  console.log("  - Earn 5% + 5% bonuses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

