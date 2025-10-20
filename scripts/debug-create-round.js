const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Debugging Round Creation ===\n");

  const [deployer] = await hre.ethers.getSigners();
  
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  const saleManagerAddress = deployment.contracts.SaleManager;
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  // Get all addresses
  console.log("Checking all contract addresses...\n");
  const nebaToken = await saleManager.nebaToken();
  const kycRegistry = await saleManager.kycRegistry();
  const rateLimiter = await saleManager.rateLimiter();
  const vestingVault = await saleManager.vestingVault();
  const fundsVault = await saleManager.fundsVault();
  const referralSystem = await saleManager.referralSystem();
  const usdc = await saleManager.usdc();
  const usdt = await saleManager.usdt();
  const ethOracle = await saleManager.ethUSDOracle();
  
  console.log("NEBA Token:", nebaToken);
  console.log("KYC Registry:", kycRegistry);
  console.log("Rate Limiter:", rateLimiter);
  console.log("Vesting Vault:", vestingVault);
  console.log("Funds Vault:", fundsVault);
  console.log("Referral System:", referralSystem);
  console.log("USDC:", usdc);
  console.log("USDT:", usdt);
  console.log("ETH Oracle:", ethOracle);
  
  // Check if any are zero address
  const addresses = [nebaToken, kycRegistry, rateLimiter, vestingVault, fundsVault, referralSystem, usdc, usdt, ethOracle];
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  
  console.log("\nAddress Validation:");
  addresses.forEach((addr, i) => {
    const names = ["NEBA Token", "KYC Registry", "Rate Limiter", "Vesting Vault", "Funds Vault", "Referral System", "USDC", "USDT", "ETH Oracle"];
    console.log(`  ${names[i]}: ${addr === zeroAddress ? "❌ ZERO ADDRESS!" : "✅"}`);
  });
  
  // Check owner and roles
  console.log("\nOwnership Check:");
  const owner = await saleManager.owner();
  console.log("  Owner:", owner);
  console.log("  Your Account:", deployer.address);
  console.log("  Match:", owner.toLowerCase() === deployer.address.toLowerCase() ? "✅" : "❌");
  
  // Check ReferralSystem roles
  console.log("\nReferralSystem Roles:");
  const refSystem = await hre.ethers.getContractAt("ReferralSystem", referralSystem);
  const DEFAULT_ADMIN_ROLE = await refSystem.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await refSystem.hasRole(DEFAULT_ADMIN_ROLE, owner);
  console.log("  Owner has DEFAULT_ADMIN_ROLE:", hasAdminRole ? "✅" : "❌");
  
  // Try to estimate gas for creating a round
  console.log("\nTrying to estimate gas...");
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const testRound = {
    name: "Test Round",
    tokenPriceUSD: 50000,
    hardCapUSD: hre.ethers.parseUnits("100000", 6),
    startTime: currentTimestamp,
    endTime: currentTimestamp + (7 * 24 * 60 * 60),
    cliffDuration: 3600,
    vestingDuration: 86400,
    isActive: true,
  };
  
  try {
    const gasEstimate = await saleManager.createRound.estimateGas(testRound);
    console.log("  Estimated gas:", gasEstimate.toString());
  } catch (error) {
    console.log("  ❌ Gas estimation failed!");
    console.log("  Error:", error.message);
    
    // Try to decode the error
    if (error.data) {
      console.log("  Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

