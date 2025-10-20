const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Diagnosing ETH Purchase Issue ===\n");

  const [user] = await hre.ethers.getSigners();
  const userAddress = user.address;
  
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const roundAddress = "0x3f0D52B87d235c7912A5bAa7aF52d4e57146488e";
  const kycRegistryAddress = deployment.contracts.KYCRegistry;
  const rateLimiterAddress = deployment.contracts.RateLimiter;
  
  console.log("Checking for user:", userAddress);
  console.log("Round:", roundAddress, "\n");
  
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const kycRegistry = await hre.ethers.getContractAt("KYCRegistry", kycRegistryAddress);
  const rateLimiter = await hre.ethers.getContractAt("RateLimiter", rateLimiterAddress);
  
  // Check 1: KYC Status
  console.log("1️⃣ KYC Status:");
  const isKYCApproved = await kycRegistry.isKYCApproved(userAddress);
  console.log("   User is KYC approved:", isKYCApproved ? "✅" : "❌ ISSUE!");
  if (!isKYCApproved) {
    console.log("   → Fix: node scripts/manage-kyc.js add " + userAddress);
  }
  
  // Check 2: Round Status
  console.log("\n2️⃣ Round Status:");
  const config = await saleRound.config();
  const currentTime = Math.floor(Date.now() / 1000);
  const isActive = config.isActive;
  const hasStarted = currentTime >= Number(config.startTime);
  const notEnded = currentTime <= Number(config.endTime);
  
  console.log("   Round is active:", isActive ? "✅" : "❌ ISSUE!");
  console.log("   Round has started:", hasStarted ? "✅" : "❌ ISSUE!");
  console.log("   Round not ended:", notEnded ? "✅" : "❌ ISSUE!");
  console.log("   Start time:", new Date(Number(config.startTime) * 1000).toLocaleString());
  console.log("   End time:", new Date(Number(config.endTime) * 1000).toLocaleString());
  console.log("   Current time:", new Date(currentTime * 1000).toLocaleString());
  
  // Check 3: Hard Cap
  console.log("\n3️⃣ Hard Cap:");
  const totalRaised = await saleRound.totalRaisedUSD();
  const hardCap = config.hardCapUSD;
  const hasCapacity = totalRaised < hardCap;
  console.log("   Total raised:", hre.ethers.formatUnits(totalRaised, 6), "USD");
  console.log("   Hard cap:", hre.ethers.formatUnits(hardCap, 6), "USD");
  console.log("   Has capacity:", hasCapacity ? "✅" : "❌ ISSUE!");
  
  // Check 4: Rate Limiter
  console.log("\n4️⃣ Rate Limiter:");
  const rateLimitInfo = await rateLimiter.getRateLimitInfo(userAddress);
  const minTimeBetweenTx = await rateLimiter.minTimeBetweenTx();
  const timeSinceLastTx = currentTime - Number(rateLimitInfo.lastTxTime);
  const canPurchase = Number(rateLimitInfo.lastTxTime) === 0 || timeSinceLastTx >= Number(minTimeBetweenTx);
  
  console.log("   Last tx time:", rateLimitInfo.lastTxTime.toString());
  console.log("   Time since last tx:", timeSinceLastTx, "seconds");
  console.log("   Min time required:", minTimeBetweenTx.toString(), "seconds");
  console.log("   Can purchase:", canPurchase ? "✅" : "❌ ISSUE! Wait", Number(minTimeBetweenTx) - timeSinceLastTx, "seconds");
  
  // Check 5: Round is Paused
  console.log("\n5️⃣ Pause Status:");
  const isPaused = await saleRound.paused();
  console.log("   Round is paused:", isPaused ? "❌ ISSUE!" : "✅");
  
  // Check 6: ETH Oracle
  console.log("\n6️⃣ ETH Oracle:");
  const ethOracleAddress = await saleRound.ethUSDOracle();
  console.log("   Oracle address:", ethOracleAddress);
  
  try {
    const ethPrice = await hre.ethers.provider.call({
      to: ethOracleAddress,
      data: "0x50d25bcd" // latestAnswer() selector
    });
    const price = hre.ethers.AbiCoder.defaultAbiCoder().decode(['int256'], ethPrice)[0];
    console.log("   ETH Price:", Number(price) / 100000000, "USD");
    console.log("   Oracle working:", price > 0 ? "✅" : "❌ ISSUE!");
  } catch (error) {
    console.log("   Oracle working: ❌ ISSUE!");
    console.log("   Error:", error.message);
    console.log("   → This is likely the problem! Oracle doesn't exist on testnet.");
  }
  
  // Check 7: Function Signature
  console.log("\n7️⃣ Function Signature:");
  console.log("   ⚠️ NOTE: buyWithETH now requires a referrer parameter!");
  console.log("   Old: buyWithETH() payable");
  console.log("   New: buyWithETH(address referrer) payable");
  console.log("");
  console.log("   Usage:");
  console.log("   - Without referral: buyWithETH(0x0000000000000000000000000000000000000000)");
  console.log("   - With referral: buyWithETH(referrerAddress)");
  
  // Summary
  console.log("\n═══════════════════════════════════════");
  console.log("           DIAGNOSIS SUMMARY");
  console.log("═══════════════════════════════════════");
  
  let hasIssues = false;
  if (!isKYCApproved) {
    console.log("❌ User not KYC approved");
    hasIssues = true;
  }
  if (!isActive || !hasStarted || !notEnded) {
    console.log("❌ Round timing issue");
    hasIssues = true;
  }
  if (!hasCapacity) {
    console.log("❌ Hard cap reached");
    hasIssues = true;
  }
  if (!canPurchase) {
    console.log("❌ Rate limit issue");
    hasIssues = true;
  }
  if (isPaused) {
    console.log("❌ Round is paused");
    hasIssues = true;
  }
  
  if (!hasIssues) {
    console.log("✅ All checks passed!");
    console.log("\nMost likely issues:");
    console.log("1. Oracle not working on testnet (check issue #6 above)");
    console.log("2. Wrong function signature (missing referrer parameter)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

