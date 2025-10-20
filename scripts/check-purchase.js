const hre = require("hardhat");

async function main() {
  const roundAddress = "0xc13E8a53D6A4D2E9DcABCA498C6B433310E3A374";
  const userAddress = "0xD3b146826834722771E4f6aC45efE0f438EF45c0";
  
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  
  console.log("=== Verifying Purchase ===\n");
  console.log("Round:", roundAddress);
  console.log("User:", userAddress, "\n");
  
  // Check user info
  const [contribution, allocation, bonus] = await saleRound.getUserInfo(userAddress);
  console.log("User Allocation:");
  console.log("  Contributed: $" + hre.ethers.formatUnits(contribution, 6));
  console.log("  Tokens:", hre.ethers.formatEther(allocation), "NEBA");
  console.log("  Bonus:", hre.ethers.formatEther(bonus), "NEBA\n");
  
  // Check round stats
  const totalRaised = await saleRound.totalRaisedUSD();
  const totalTokensSold = await saleRound.totalTokensSold();
  
  console.log("Round Statistics:");
  console.log("  Total Raised: $" + hre.ethers.formatUnits(totalRaised, 6));
  console.log("  Total Tokens Sold:", hre.ethers.formatEther(totalTokensSold), "NEBA\n");
  
  if (totalRaised > 0) {
    console.log("✅ Purchase confirmed! The round has received funds.");
  } else {
    console.log("⚠️  No funds raised yet. Check transaction on Basescan.");
  }
  
  console.log("\nView transaction:");
  console.log("https://sepolia.basescan.org/tx/0x7077387b7b39dda3547b71d2d88385bbdd725c6d273c5faab53f778376038905");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

