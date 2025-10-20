const hre = require("hardhat");
const fs = require("fs");

// Base Mainnet addresses
const BASE_USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_USDT_MAINNET = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const ETH_USD_ORACLE_MAINNET = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

// Base Sepolia Test tokens (deployed mocks)
const BASE_USDC_TESTNET = "0xA100b6aC62cf0dDd94b3BeC2b50c3d2D6150DA02";
const BASE_USDT_TESTNET = "0x58912D02E65CC3923F11d724f7ea5ccBcEFCAe88";
const ETH_USD_ORACLE_TESTNET = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e";

async function main() {
  console.log("Starting NEBA Presale deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Validate required environment variables
  const multisig = process.env.MULTISIG_ADDRESS;
  if (!multisig || multisig === "0x_your_multisig_address") {
    throw new Error("Please set MULTISIG_ADDRESS in .env file");
  }

  const nebaTokenAddress = process.env.NEBA_TOKEN_ADDRESS;
  if (!nebaTokenAddress || nebaTokenAddress === "0x_your_neba_token_address") {
    throw new Error("Please set NEBA_TOKEN_ADDRESS in .env file");
  }

  console.log("Multisig address:", multisig);
  console.log("NEBA Token address:", nebaTokenAddress, "\n");

  // Determine which tokens and oracle to use based on network
  let BASE_USDC, BASE_USDT, ETH_USD_ORACLE;
  
  if (hre.network.name === "baseSepolia" || hre.network.name === "localhost") {
    console.log("🧪 Using testnet configuration (mock tokens and oracle)");
    BASE_USDC = BASE_USDC_TESTNET;
    BASE_USDT = BASE_USDT_TESTNET;
    ETH_USD_ORACLE = ETH_USD_ORACLE_TESTNET;
  } else {
    console.log("🚀 Using mainnet configuration (real tokens and Chainlink oracle)");
    BASE_USDC = BASE_USDC_MAINNET;
    BASE_USDT = BASE_USDT_MAINNET;
    ETH_USD_ORACLE = ETH_USD_ORACLE_MAINNET;
  }
  
  console.log("USDC:", BASE_USDC);
  console.log("USDT:", BASE_USDT);
  console.log("ETH/USD Oracle:", ETH_USD_ORACLE, "\n");

  // Verify token contract exists
  const tokenCode = await hre.ethers.provider.getCode(nebaTokenAddress);
  if (tokenCode === "0x") {
    throw new Error("NEBA_TOKEN_ADDRESS does not point to a valid contract");
  }

  // 1. Deploy KYC Registry
  console.log("=== Deploying KYC Registry ===");
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy(multisig);
  await kycRegistry.waitForDeployment();
  const kycRegistryAddress = await kycRegistry.getAddress();
  console.log("KYC Registry deployed at:", kycRegistryAddress, "\n");

  // 2. Deploy Rate Limiter
  console.log("=== Deploying Rate Limiter ===");
  const RateLimiter = await hre.ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(multisig);
  await rateLimiter.waitForDeployment();
  const rateLimiterAddress = await rateLimiter.getAddress();
  console.log("Rate Limiter deployed at:", rateLimiterAddress, "\n");

  // 3. Deploy Funds Vault
  console.log("=== Deploying Funds Vault ===");
  const FundsVault = await hre.ethers.getContractFactory("FundsVault");
  const fundsVault = await FundsVault.deploy(multisig);
  await fundsVault.waitForDeployment();
  const fundsVaultAddress = await fundsVault.getAddress();
  console.log("Funds Vault deployed at:", fundsVaultAddress, "\n");

  // 4. Deploy Sale Manager (temporary vesting vault)
  console.log("=== Deploying Sale Manager (temporary) ===");
  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const tempSaleManager = await SaleManager.deploy(
    nebaTokenAddress,
    kycRegistryAddress,
    rateLimiterAddress,
    deployer.address, // Temporary vesting vault
    fundsVaultAddress,
    BASE_USDC,
    BASE_USDT,
    ETH_USD_ORACLE,
    multisig
  );
  await tempSaleManager.waitForDeployment();
  const tempSaleManagerAddress = await tempSaleManager.getAddress();
  console.log("Sale Manager (temp) deployed at:", tempSaleManagerAddress, "\n");

  // 5. Deploy Vesting Vault
  console.log("=== Deploying Vesting Vault ===");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(nebaTokenAddress);
  await vestingVault.waitForDeployment();
  const vestingVaultAddress = await vestingVault.getAddress();
  console.log("Vesting Vault deployed at:", vestingVaultAddress, "\n");

  // Initialize vesting vault with sale manager
  console.log("=== Initializing Vesting Vault ===");
  await vestingVault.initialize(tempSaleManagerAddress);
  console.log("Vesting Vault initialized with Sale Manager\n");

  // Use the vesting vault address
  const finalVestingVault = vestingVaultAddress;
  const finalSaleManager = tempSaleManagerAddress;

  // Summary
  console.log("=== Deployment Summary ===");
  console.log("NEBA Token (existing):", nebaTokenAddress);
  console.log("KYC Registry:", kycRegistryAddress);
  console.log("Rate Limiter:", rateLimiterAddress);
  console.log("Funds Vault:", fundsVaultAddress);
  console.log("Vesting Vault:", finalVestingVault);
  console.log("Sale Manager:", finalSaleManager);

  // Save deployment addresses
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
      VestingVault: finalVestingVault,
      SaleManager: finalSaleManager,
    },
  };

  const deploymentPath = `deployments-${hre.network.name}.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to ${deploymentPath}`);

  // Also save as .env format
  const envFormat = `
# Deployment on ${hre.network.name} - ${new Date().toISOString()}
NEBA_TOKEN=${nebaTokenAddress}
KYC_REGISTRY=${kycRegistryAddress}
RATE_LIMITER=${rateLimiterAddress}
FUNDS_VAULT=${fundsVaultAddress}
VESTING_VAULT=${finalVestingVault}
SALE_MANAGER=${finalSaleManager}
`;

  fs.writeFileSync(`deployments-${hre.network.name}.env`, envFormat);
  console.log(`Deployment addresses saved to deployments-${hre.network.name}.env\n`);

  // Next steps
  console.log("=== Next Steps ===");
  console.log("1. Transfer NEBA tokens to VestingVault for distribution:");
  console.log("   - VestingVault address:", finalVestingVault);
  console.log("   - Recommended amount: 300M tokens for presale");
  console.log("   - From your NEBA token contract, call: transfer(vestingVaultAddress, amount)");
  console.log("");
  console.log("2. Verify contracts on Basescan:");
  console.log("   npm run verify:all");
  console.log("");
  console.log("3. Create sale rounds:");
  console.log("   npm run create-rounds");
  console.log("");
  console.log("4. Add KYC whitelist:");
  console.log("   node scripts/manage-kyc.js add <address>");
  console.log("");
  console.log("5. Authorize sale rounds as depositors in FundsVault (from multisig)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
