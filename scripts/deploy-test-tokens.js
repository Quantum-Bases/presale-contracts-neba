const hre = require("hardhat");

async function main() {
  console.log("=== Deploying Test Tokens for Base Sepolia ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address, "\n");

  // Deploy Mock USDC (6 decimals)
  console.log("1️⃣ Deploying Mock USDC...");
  const MockUSDC = await hre.ethers.getContractFactory("ERC20Mock");
  const usdc = await MockUSDC.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("   ✅ Mock USDC deployed at:", usdcAddress);

  // Deploy Mock Neba (18 decimals)
  console.log("1️⃣ Deploying Mock USDC...");
  const MockNeba = await hre.ethers.getContractFactory("ERC20Mock");
  const neba = await MockNeba.deploy("Neba Token", "Neba", 18);
  await neba.waitForDeployment();
  const nebaAddress = await neba.getAddress();
  console.log("   ✅ Mock Neba deployed at:", nebaAddress);

  // Deploy Mock USDT (6 decimals)
  console.log("\n2️⃣ Deploying Mock USDT...");
  const MockUSDT = await hre.ethers.getContractFactory("ERC20Mock");
  const usdt = await MockUSDT.deploy("Tether USD", "USDT", 6);
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  console.log("   ✅ Mock USDT deployed at:", usdtAddress);

  // Mint test tokens to deployer
  console.log("\n3️⃣ Minting test tokens...");
  const mintAmount = hre.ethers.parseUnits("1000000", 6); // 1M tokens
  
  console.log("\n3️⃣ Minting test Neba tokens...");
  const nebaMintAmount = hre.ethers.parseUnits("1000000", 18); // 1M tokens
  
  await usdc.mint(deployer.address, mintAmount);
  console.log("   ✅ Minted 1,000,000 USDC to", deployer.address);
  
  await usdt.mint(deployer.address, mintAmount);
  console.log("   ✅ Minted 1,000,000 USDT to", deployer.address);

  await neba.mint(deployer.address, nebaMintAmount);
  console.log("   ✅ Minted 1,000,000 Neba to", deployer.address);

  console.log("\n═══════════════════════════════════════");
  console.log("          TEST TOKENS DEPLOYED");
  console.log("═══════════════════════════════════════");
  console.log("Mock USDC:", usdcAddress);
  console.log("Mock USDT:", usdtAddress);
  console.log("Mock USDT:", nebaAddress);

  console.log("\nView on Basescan:");
  console.log("  USDC: https://sepolia.basescan.org/address/" + usdcAddress);
  console.log("  USDT: https://sepolia.basescan.org/address/" + usdtAddress);
  console.log("  USDT: https://sepolia.basescan.org/address/" + nebaAddress);
  console.log("\n⚠️ IMPORTANT: You need to redeploy the presale system with these token addresses!");
  console.log("\nUpdate your deployment script:");
  console.log("  - Replace BASE_USDC with:", usdcAddress);
  console.log("  - Replace BASE_USDT with:", usdtAddress);
  console.log("  - Replace BASE_USDT with:", nebaAddress);

  console.log("\nOr update your .env:");
  console.log("  TEST_USDC=" + usdcAddress);
  console.log("  TEST_USDT=" + usdtAddress);
  console.log("  TEST_NEBA=" + nebaAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

