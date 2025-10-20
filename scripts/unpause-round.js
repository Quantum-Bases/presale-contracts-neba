const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Unpausing Sale Round ===\n");

  const [admin] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const saleManagerAddress = deployment.contracts.SaleManager;
  const roundIndex = 0;
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Round Index:", roundIndex);
  console.log("Admin:", admin.address, "\n");
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  const roundAddress = await saleManager.getRound(roundIndex);
  
  console.log("Round Address:", roundAddress);
  
  // Check if paused
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const isPaused = await saleRound.paused();
  
  console.log("Currently paused:", isPaused ? "Yes ❌" : "No ✅");
  
  if (isPaused) {
    console.log("\nUnpausing round...");
    const tx = await saleManager.unpauseRound(roundIndex);
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Round unpaused!\n");
    
    const stillPaused = await saleRound.paused();
    console.log("Verification:");
    console.log("  Round paused:", stillPaused ? "Still paused ❌" : "Unpaused ✅");
    
    if (!stillPaused) {
      console.log("\n🎉 Round is now active and ready for purchases!");
    }
  } else {
    console.log("\n✅ Round is already unpaused and active!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

