const hre = require("hardhat");

async function main() {
  console.log("=== Updating Oracle Address ===\n");

  const roundAddress = "0x3f0D52B87d235c7912A5bAa7aF52d4e57146488e";
  const mockOracleAddress = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e"; // From earlier deployment
  
  console.log("Round:", roundAddress);
  console.log("New Oracle:", mockOracleAddress, "\n");
  
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  
  // Update oracle
  console.log("Updating oracle address...");
  const tx = await saleRound.updateOracle(mockOracleAddress);
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Oracle updated!\n");
  
  // Verify
  const newOracle = await saleRound.ethUSDOracle();
  console.log("Verification:");
  console.log("  New oracle address:", newOracle);
  console.log("  Match:", newOracle === mockOracleAddress ? "✅" : "❌");
  
  // Test oracle
  console.log("\nTesting oracle...");
  try {
    const ethPrice = await hre.ethers.provider.call({
      to: newOracle,
      data: "0x50d25bcd" // latestAnswer()
    });
    const price = hre.ethers.AbiCoder.defaultAbiCoder().decode(['int256'], ethPrice)[0];
    console.log("  ETH Price:", Number(price) / 100000000, "USD");
    console.log("  Oracle working: ✅");
  } catch (error) {
    console.log("  Oracle working: ❌", error.message);
  }
  
  console.log("\n🎉 Oracle fixed! ETH purchases should now work.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

