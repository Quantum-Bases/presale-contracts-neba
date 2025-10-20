const hre = require("hardhat");
const fs = require("fs");

// Base Mainnet
const BASE_USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BASE_USDT_MAINNET = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const ETH_USD_ORACLE_MAINNET = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

// Base Sepolia Test
const BASE_USDC_TESTNET = "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176";
const BASE_USDT_TESTNET = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
const ETH_USD_ORACLE_TESTNET = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e";

async function main() {
  console.log("=== NEBA Presale - Clean Deployment ===\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const multisig = process.env.MULTISIG_ADDRESS;
  const nebaTokenAddress = process.env.NEBA_TOKEN_ADDRESS;

  // Network config
  let BASE_USDC, BASE_USDT, ETH_USD_ORACLE;
  if (hre.network.name === "baseSepolia") {
    BASE_USDC = BASE_USDC_TESTNET;
    BASE_USDT = BASE_USDT_TESTNET;
    ETH_USD_ORACLE = ETH_USD_ORACLE_TESTNET;
  } else {
    BASE_USDC = BASE_USDC_MAINNET;
    BASE_USDT = BASE_USDT_MAINNET;
    ETH_USD_ORACLE = ETH_USD_ORACLE_MAINNET;
  }

  console.log("Network:", hre.network.name);
  console.log("NEBA Token:", nebaTokenAddress);
  console.log("Multisig:", multisig, "\n");

  // Deploy
  console.log("1️⃣ KYC Registry...");
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy(multisig);
  await kycRegistry.waitForDeployment();
  const kycAddr = await kycRegistry.getAddress();
  console.log("   ✅", kycAddr);

  console.log("2️⃣ Rate Limiter...");
  const RateLimiter = await hre.ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(multisig);
  await rateLimiter.waitForDeployment();
  const rateAddr = await rateLimiter.getAddress();
  console.log("   ✅", rateAddr);

  console.log("3️⃣ Funds Vault...");
  const FundsVault = await hre.ethers.getContractFactory("FundsVault");
  const fundsVault = await FundsVault.deploy(multisig);
  await fundsVault.waitForDeployment();
  const fundsAddr = await fundsVault.getAddress();
  console.log("   ✅", fundsAddr);

  console.log("4️⃣ Sale Manager...");
  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const saleManager = await SaleManager.deploy(
    nebaTokenAddress, kycAddr, rateAddr, multisig, fundsAddr,
    BASE_USDC, BASE_USDT, ETH_USD_ORACLE, multisig
  );
  await saleManager.waitForDeployment();
  const smAddr = await saleManager.getAddress();
  console.log("   ✅", smAddr);

  console.log("5️⃣ Vesting Vault...");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(nebaTokenAddress, smAddr);
  await vestingVault.waitForDeployment();
  const vestAddr = await vestingVault.getAddress();
  console.log("   ✅", vestAddr);

  const refAddr = await saleManager.referralSystem();
  console.log("6️⃣ Referral System:", refAddr, "\n");

  // Save
  const info = {
    network: hre.network.name,
    deployer: deployer.address,
    multisig: multisig,
    timestamp: new Date().toISOString(),
    contracts: {
      NEBAToken: nebaTokenAddress,
      KYCRegistry: kycAddr,
      RateLimiter: rateAddr,
      FundsVault: fundsAddr,
      VestingVault: vestAddr,
      ReferralSystem: refAddr,
      SaleManager: smAddr,
    },
  };

  fs.writeFileSync(`deployments-${hre.network.name}.json`, JSON.stringify(info, null, 2));
  console.log("✅ Deployment complete!\n");
  
  console.log("Next: Create round with:");
  console.log("  npx hardhat run scripts/create-private-sale.js --network baseSepolia");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

