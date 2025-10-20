const hre = require("hardhat");
const fs = require("fs");

// Base Mainnet addresses
const BASE_USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_USDT_MAINNET = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const ETH_USD_ORACLE_MAINNET = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

// Base Sepolia Test tokens
const BASE_USDC_TESTNET = "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176";
const BASE_USDT_TESTNET = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
const ETH_USD_ORACLE_TESTNET = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e";

async function main() {
  console.log("=== NEBA Presale - Simple Deployment ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  const multisig = process.env.MULTISIG_ADDRESS;
  const nebaTokenAddress = process.env.NEBA_TOKEN_ADDRESS;

  // Determine network config
  let BASE_USDC, BASE_USDT, ETH_USD_ORACLE;
  if (hre.network.name === "baseSepolia" || hre.network.name === "localhost") {
    console.log("🧪 Testnet Mode");
    BASE_USDC = BASE_USDC_TESTNET;
    BASE_USDT = BASE_USDT_TESTNET;
    ETH_USD_ORACLE = ETH_USD_ORACLE_TESTNET;
  } else {
    console.log("🚀 Mainnet Mode");
    BASE_USDC = BASE_USDC_MAINNET;
    BASE_USDT = BASE_USDT_MAINNET;
    ETH_USD_ORACLE = ETH_USD_ORACLE_MAINNET;
  }

  console.log("USDC:", BASE_USDC);
  console.log("USDT:", BASE_USDT);
  console.log("Oracle:", ETH_USD_ORACLE);
  console.log("Multisig:", multisig);
  console.log("NEBA Token:", nebaTokenAddress, "\n");

  // 1. Deploy infrastructure
  console.log("1️⃣ Deploying KYC Registry...");
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy(multisig);
  await kycRegistry.waitForDeployment();
  const kycRegistryAddress = await kycRegistry.getAddress();
  console.log("   ✅", kycRegistryAddress, "\n");

  console.log("2️⃣ Deploying Rate Limiter...");
  const RateLimiter = await hre.ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(multisig);
  await rateLimiter.waitForDeployment();
  const rateLimiterAddress = await rateLimiter.getAddress();
  console.log("   ✅", rateLimiterAddress, "\n");

  console.log("3️⃣ Deploying Funds Vault...");
  const FundsVault = await hre.ethers.getContractFactory("FundsVault");
  const fundsVault = await FundsVault.deploy(multisig);
  await fundsVault.waitForDeployment();
  const fundsVaultAddress = await fundsVault.getAddress();
  console.log("   ✅", fundsVaultAddress, "\n");

  // 2. Deploy SaleManager with placeholder vault
  console.log("4️⃣ Deploying Sale Manager...");
  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const saleManager = await SaleManager.deploy(
    nebaTokenAddress,
    kycRegistryAddress,
    rateLimiterAddress,
    multisig, // Temporary - will be replaced
    fundsVaultAddress,
    BASE_USDC,
    BASE_USDT,
    ETH_USD_ORACLE,
    multisig
  );
  await saleManager.waitForDeployment();
  const saleManagerAddress = await saleManager.getAddress();
  console.log("   ✅", saleManagerAddress, "\n");

  // 3. Deploy VestingVault with SaleManager
  console.log("5️⃣ Deploying Vesting Vault...");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(nebaTokenAddress);
  await vestingVault.waitForDeployment();
  const vestingVaultAddress = await vestingVault.getAddress();
  console.log("   ✅", vestingVaultAddress, "\n");

  // Initialize vesting vault
  console.log("6️⃣ Initializing Vesting Vault...");
  await vestingVault.initialize(saleManagerAddress);
  console.log("   ✅ Vesting Vault initialized\n");

  // Get ReferralSystem address
  const referralSystemAddress = await saleManager.referralSystem();
  console.log("7️⃣ Referral System:", referralSystemAddress, "\n");

  // Summary
  console.log("═══════════════════════════════════════");
  console.log("   DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════");
  console.log("NEBA Token:", nebaTokenAddress);
  console.log("KYC Registry:", kycRegistryAddress);
  console.log("Rate Limiter:", rateLimiterAddress);
  console.log("Funds Vault:", fundsVaultAddress);
  console.log("Vesting Vault:", vestingVaultAddress);
  console.log("Referral System:", referralSystemAddress);
  console.log("Sale Manager:", saleManagerAddress);

  // Save
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    multisig: multisig,
    timestamp: new Date().toISOString(),
    contracts: {
      NEBAToken: nebaTokenAddress,
      KYCRegistry: kycRegistryAddress,
      RateLimiter: rateLimiterAddress,
      FundsVault: fundsVaultAddress,
      VestingVault: vestingVaultAddress,
      ReferralSystem: referralSystemAddress,
      SaleManager: saleManagerAddress,
    },
  };

  fs.writeFileSync(`deployments-${hre.network.name}.json`, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n✅ Saved to deployments-" + hre.network.name + ".json");
  
  console.log("\n⚠️  NOTE: SaleManager vestingVault points to temporary address!");
  console.log("The correct VestingVault is:", vestingVaultAddress);
  console.log("When creating rounds, they will use this VestingVault address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

