const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Creating Private Sale Round ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating round with account:", deployer.address);
  
  // Load deployment addresses
  const deploymentPath = `deployments-${hre.network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const saleManagerAddress = deployment.contracts.SaleManager;
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Network:", hre.network.name, "\n");

  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);

  // Check if we're the owner
  const owner = await saleManager.owner();
  console.log("SaleManager Owner:", owner);
  console.log("Your Account:", deployer.address);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("\n❌ Error: You are not the owner of SaleManager!");
    console.error("Only the owner can create rounds.");
    console.error("\nPlease ensure your .env PRIVATE_KEY matches the owner account.");
    process.exit(1);
  }
  console.log("✅ You are the owner!\n");

  // Private Sale Configuration
  const currentTimestamp = Math.floor(Date.now() / 1000);
  
  const privateSaleRound = {
    name: "Private Sale",
    tokenPriceUSD: 50000,  // $0.05 USD (6 decimals: 0.05 * 1,000,000)
    hardCapUSD: hre.ethers.parseUnits("500000", 6), // $500,000 USD
    startTime: currentTimestamp,
    endTime: currentTimestamp + (30 * 24 * 60 * 60), // 30 days from now
    cliffDuration: 180 * 24 * 60 * 60, // 180 days (6 months)
    vestingDuration: 365 * 24 * 60 * 60, // 365 days (12 months)
    isActive: true,
  };

  console.log("Private Sale Round Configuration:");
  console.log("─────────────────────────────────────");
  console.log("  Name:", privateSaleRound.name);
  console.log("  Token Price: $0.05 USD");
  console.log("  Hard Cap: $500,000 USD");
  console.log("  Start:", new Date(privateSaleRound.startTime * 1000).toLocaleString());
  console.log("  End:", new Date(privateSaleRound.endTime * 1000).toLocaleString());
  console.log("  Cliff Period: 6 months (180 days)");
  console.log("  Vesting Period: 12 months (365 days)");
  console.log("  Status: Active");
  console.log("─────────────────────────────────────\n");

  console.log("Creating Private Sale round...");
  const tx = await saleManager.createRound(privateSaleRound);
  console.log("✅ Transaction sent:", tx.hash);
  console.log("⏳ Waiting for confirmation...\n");
  
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");
  console.log("   Block:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString(), "\n");
  
  // Get the round address
  const roundCount = await saleManager.getRoundCount();
  const roundIndex = Number(roundCount) - 1;
  const roundAddress = await saleManager.getRound(roundIndex);
  
  console.log("🎉 Private Sale Round Created Successfully!");
  console.log("═══════════════════════════════════════════════");
  console.log("  Round Index:", roundIndex.toString());
  console.log("  Round Address:", roundAddress);
  console.log("═══════════════════════════════════════════════\n");
  
  console.log("📍 View on Basescan:");
  console.log("   https://sepolia.basescan.org/address/" + roundAddress + "\n");
  
  // Get referral system address
  const referralSystemAddress = await saleManager.referralSystem();
  console.log("🎁 Referral System:");
  console.log("   Address:", referralSystemAddress);
  console.log("   Referrer Bonus: 5%");
  console.log("   Referee Bonus: 5%\n");
  
  // Update deployment file
  if (!deployment.rounds) {
    deployment.rounds = [];
  }
  deployment.rounds.push({
    index: roundIndex.toString(),
    name: "Private Sale",
    address: roundAddress,
    tokenPrice: "$0.05",
    hardCap: "$500,000",
    createdAt: new Date().toISOString(),
  });
  
  if (!deployment.contracts.ReferralSystem) {
    deployment.contracts.ReferralSystem = referralSystemAddress;
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("✅ Deployment file updated\n");
  
  console.log("═══════════════════════════════════════════════");
  console.log("         🚀 NEXT STEPS - IMPORTANT!");
  console.log("═══════════════════════════════════════════════\n");
  
  console.log("1️⃣ Authorize Round in FundsVault:");
  console.log("   Contract:", deployment.contracts.FundsVault);
  console.log("   Function: authorizeDepositor(address)");
  console.log("   Parameter:", roundAddress);
  console.log("   Or run: node scripts/authorize-round.js", roundIndex.toString(), "\n");
  
  console.log("2️⃣ Grant SALE_ROUND_ROLE in RateLimiter:");
  console.log("   Contract:", deployment.contracts.RateLimiter);
  console.log("   Get role: SALE_ROUND_ROLE()");
  console.log("   Function: grantRole(bytes32, address)");
  console.log("   Parameters: SALE_ROUND_ROLE,", roundAddress, "\n");
  
  console.log("3️⃣ Add KYC Whitelist:");
  console.log("   node scripts/manage-kyc.js add <user_address>\n");
  
  console.log("4️⃣ Test Purchase:");
  console.log("   - User must be KYC approved");
  console.log("   - Approve USDC/USDT");
  console.log("   - Call buyWithUSDC(amount, referrerAddress)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  });
