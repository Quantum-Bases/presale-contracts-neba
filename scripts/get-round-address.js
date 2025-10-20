const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  const saleManagerAddress = deployment.contracts.SaleManager;
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  const roundCount = await saleManager.getRoundCount();
  console.log("Total Rounds:", roundCount.toString(), "\n");
  
  if (roundCount > 0) {
    console.log("Sale Round Addresses:");
    console.log("═══════════════════════════════════════════════");
    for (let i = 0; i < Number(roundCount); i++) {
      const roundAddress = await saleManager.getRound(i);
      const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
      const config = await saleRound.config();
      
      console.log(`\nRound ${i}: ${config.name}`);
      console.log("  Address:", roundAddress);
      console.log("  Token Price: $${Number(config.tokenPriceUSD) / 1000000}");
      console.log("  Hard Cap: $${hre.ethers.formatUnits(config.hardCapUSD, 6)}");
      console.log("  Active:", config.isActive);
      console.log("  Basescan: https://sepolia.basescan.org/address/" + roundAddress);
    }
    console.log("═══════════════════════════════════════════════");
  }
  
  // Get ReferralSystem
  const referralSystemAddress = await saleManager.referralSystem();
  console.log("\n🎁 Referral System:", referralSystemAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

