const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Creating sale rounds...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating rounds with account:", deployer.address, "\n");

  // Load deployment addresses
  const deploymentPath = `deployments-${hre.network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const saleManagerAddress = deployment.contracts.SaleManager;
  console.log("Sale Manager address:", saleManagerAddress, "\n");

  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const saleManager = SaleManager.attach(saleManagerAddress);

  const currentTimestamp = Math.floor(Date.now() / 1000);

  // Round 1: Private Sale
  // Price: $0.05, Hard Cap: $500,000, 6 months cliff, 12 months vesting
  console.log("=== Creating Private Sale Round ===");
  const privateRound = {
    name: "Private Sale",
    tokenPriceUSD: 50000, // $0.05 with 6 decimals
    hardCapUSD: hre.ethers.parseUnits("500000", 6), // $500,000
    startTime: currentTimestamp,
    endTime: currentTimestamp + 30 * 24 * 60 * 60, // 30 days
    cliffDuration: 180 * 24 * 60 * 60, // 180 days (6 months)
    vestingDuration: 365 * 24 * 60 * 60, // 365 days (12 months)
    isActive: true,
  };

  const tx1 = await saleManager.createRound(privateRound);
  const receipt1 = await tx1.wait();
  const privateRoundAddr = await saleManager.getRound(0);
  console.log("Private Sale Round created at:", privateRoundAddr);
  console.log("Transaction hash:", receipt1.hash, "\n");

  // Round 2: Community Sale
  // Price: $0.08, Hard Cap: $800,000, 3 months cliff, 9 months vesting
  console.log("=== Creating Community Sale Round ===");
  const communityRound = {
    name: "Community Sale",
    tokenPriceUSD: 80000, // $0.08
    hardCapUSD: hre.ethers.parseUnits("800000", 6),
    startTime: currentTimestamp + 31 * 24 * 60 * 60,
    endTime: currentTimestamp + 60 * 24 * 60 * 60,
    cliffDuration: 90 * 24 * 60 * 60, // 3 months
    vestingDuration: 270 * 24 * 60 * 60, // 9 months
    isActive: true,
  };

  const tx2 = await saleManager.createRound(communityRound);
  const receipt2 = await tx2.wait();
  const communityRoundAddr = await saleManager.getRound(1);
  console.log("Community Sale Round created at:", communityRoundAddr);
  console.log("Transaction hash:", receipt2.hash, "\n");

  // Round 3: Strategic Sale
  // Price: $0.10, Hard Cap: $1,000,000, 2 months cliff, 6 months vesting
  console.log("=== Creating Strategic Sale Round ===");
  const strategicRound = {
    name: "Strategic Sale",
    tokenPriceUSD: 100000, // $0.10
    hardCapUSD: hre.ethers.parseUnits("1000000", 6),
    startTime: currentTimestamp + 61 * 24 * 60 * 60,
    endTime: currentTimestamp + 90 * 24 * 60 * 60,
    cliffDuration: 60 * 24 * 60 * 60, // 2 months
    vestingDuration: 180 * 24 * 60 * 60, // 6 months
    isActive: true,
  };

  const tx3 = await saleManager.createRound(strategicRound);
  const receipt3 = await tx3.wait();
  const strategicRoundAddr = await saleManager.getRound(2);
  console.log("Strategic Sale Round created at:", strategicRoundAddr);
  console.log("Transaction hash:", receipt3.hash, "\n");

  // Round 4: Public Sale
  // Price: $0.15, Hard Cap: $1,500,000, 1 month cliff, 4 months vesting
  console.log("=== Creating Public Sale Round ===");
  const publicRound = {
    name: "Public Sale",
    tokenPriceUSD: 150000, // $0.15
    hardCapUSD: hre.ethers.parseUnits("1500000", 6),
    startTime: currentTimestamp + 91 * 24 * 60 * 60,
    endTime: currentTimestamp + 120 * 24 * 60 * 60,
    cliffDuration: 30 * 24 * 60 * 60, // 1 month
    vestingDuration: 120 * 24 * 60 * 60, // 4 months
    isActive: true,
  };

  const tx4 = await saleManager.createRound(publicRound);
  const receipt4 = await tx4.wait();
  const publicRoundAddr = await saleManager.getRound(3);
  console.log("Public Sale Round created at:", publicRoundAddr);
  console.log("Transaction hash:", receipt4.hash, "\n");

  // Summary
  console.log("=== Round Creation Summary ===");
  const roundCount = await saleManager.getRoundCount();
  console.log("Total rounds created:", roundCount.toString());
  console.log("Private Sale:", privateRoundAddr);
  console.log("Community Sale:", communityRoundAddr);
  console.log("Strategic Sale:", strategicRoundAddr);
  console.log("Public Sale:", publicRoundAddr);

  // Save round addresses
  deployment.rounds = [
    { name: "Private Sale", address: privateRoundAddr },
    { name: "Community Sale", address: communityRoundAddr },
    { name: "Strategic Sale", address: strategicRoundAddr },
    { name: "Public Sale", address: publicRoundAddr },
  ];

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\nRound addresses saved to ${deploymentPath}`);

  console.log("\n=== Next Steps ===");
  console.log("1. Authorize each round as a depositor in FundsVault (from multisig)");
  console.log("2. Grant SALE_ROUND_ROLE to each round in RateLimiter (from multisig)");
  console.log("3. Add users to KYC whitelist");
  console.log("\nExample commands:");
  console.log(`   await fundsVault.authorizeDepositor("${privateRoundAddr}")`);
  console.log(`   await rateLimiter.grantRole(SALE_ROUND_ROLE, "${privateRoundAddr}")`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

