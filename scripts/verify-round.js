const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Verifying Private Sale Round ===\n");

  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const roundAddress = "0x3f0D52B87d235c7912A5bAa7aF52d4e57146488e";
  const saleManagerAddress = deployment.contracts.SaleManager;
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  // Get all the addresses needed for constructor
  const nebaToken = await saleManager.nebaToken();
  const kycRegistry = await saleManager.kycRegistry();
  const rateLimiter = await saleManager.rateLimiter();
  const vestingVault = await saleManager.vestingVault();
  const fundsVault = await saleManager.fundsVault();
  const referralSystem = await saleManager.referralSystem();
  const usdc = await saleManager.usdc();
  const usdt = await saleManager.usdt();
  const ethOracle = await saleManager.ethUSDOracle();
  
  // Get the round config
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const config = await saleRound.config();
  
  console.log("Round Address:", roundAddress);
  console.log("Round Name:", config.name);
  console.log("\nConstructor Arguments:");
  console.log("  Manager:", saleManagerAddress);
  console.log("  NEBA Token:", nebaToken);
  console.log("  KYC Registry:", kycRegistry);
  console.log("  Rate Limiter:", rateLimiter);
  console.log("  Vesting Vault:", vestingVault);
  console.log("  Funds Vault:", fundsVault);
  console.log("  Referral System:", referralSystem);
  console.log("  USDC:", usdc);
  console.log("  USDT:", usdt);
  console.log("  ETH Oracle:", ethOracle);
  console.log("\nRound Config:");
  console.log("  Name:", config.name);
  console.log("  Token Price USD:", config.tokenPriceUSD.toString());
  console.log("  Hard Cap USD:", config.hardCapUSD.toString());
  console.log("  Start Time:", config.startTime.toString());
  console.log("  End Time:", config.endTime.toString());
  console.log("  Cliff Duration:", config.cliffDuration.toString());
  console.log("  Vesting Duration:", config.vestingDuration.toString());
  console.log("  Is Active:", config.isActive);
  console.log("\n");

  try {
    console.log("Verifying contract on Basescan...");
    await hre.run("verify:verify", {
      address: roundAddress,
      constructorArguments: [
        saleManagerAddress,
        nebaToken,
        kycRegistry,
        rateLimiter,
        vestingVault,
        fundsVault,
        referralSystem,
        usdc,
        usdt,
        ethOracle,
        config
      ],
    });
    console.log("\n✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("already verified")) {
      console.log("✅ Contract already verified!");
    } else {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  console.log("\nView on Basescan:");
  console.log("https://sepolia.basescan.org/address/" + roundAddress + "#code");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

