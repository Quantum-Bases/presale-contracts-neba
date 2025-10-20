const hre = require("hardhat");
const fs = require("fs");

// Testnet mock addresses
const BASE_USDC_TESTNET = "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176";
const BASE_USDT_TESTNET = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
const ETH_USD_ORACLE_TESTNET = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e";

async function main() {
  console.log("=== NEBA Presale - FINAL Clean Deployment ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const multisig = process.env.MULTISIG_ADDRESS;
  const nebaToken = process.env.NEBA_TOKEN_ADDRESS;

  console.log("Deployer:", deployer.address);
  console.log("Multisig:", multisig);
  console.log("NEBA Token:", nebaToken, "\n");

  // 1. Infrastructure
  console.log("Deploying infrastructure...");
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy(multisig);
  await kycRegistry.waitForDeployment();
  const kycAddr = await kycRegistry.getAddress();

  const RateLimiter = await hre.ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(multisig);
  await rateLimiter.waitForDeployment();
  const rateAddr = await rateLimiter.getAddress();

  const FundsVault = await hre.ethers.getContractFactory("FundsVault");
  const fundsVault = await FundsVault.deploy(multisig);
  await fundsVault.waitForDeployment();
  const fundsAddr = await fundsVault.getAddress();

  console.log("✅ Infrastructure deployed\n");

  // 2. Deploy SaleManager FIRST (before VestingVault)
  // Use deployer address as TEMPORARY placeholder for vestingVault
  console.log("Deploying SaleManager (with placeholder)...");
  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const saleManager = await SaleManager.deploy(
    nebaToken, kycAddr, rateAddr, deployer.address, fundsAddr,
    BASE_USDC_TESTNET, BASE_USDT_TESTNET, ETH_USD_ORACLE_TESTNET, multisig
  );
  await saleManager.waitForDeployment();
  const smAddr = await saleManager.getAddress();
  console.log("✅ SaleManager deployed:", smAddr, "\n");

  // 3. Now deploy ACTUAL VestingVault pointing to SaleManager
  console.log("Deploying VestingVault...");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(nebaToken, smAddr);
  await vestingVault.waitForDeployment();
  const vestAddr = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed:", vestAddr, "\n");

  const refAddr = await saleManager.referralSystem();
  console.log("✅ Referral System:", refAddr, "\n");

  // 4. NOW create the round - it will use the SaleManager's vestingVault
  // But SaleManager still has the placeholder! We need to create round manually with correct vesting vault
  
  console.log("⚠️  NOTE: SaleManager has placeholder vestingVault");
  console.log("    When creating rounds, pass the correct vestingVault: " + vestAddr);
  
  // Save
  const info = {
    network: hre.network.name,
    deployer: deployer.address,
    multisig: multisig,
    timestamp: new Date().toISOString(),
    contracts: {
      NEBAToken: nebaToken,
      KYCRegistry: kycAddr,
      RateLimiter: rateAddr,
      FundsVault: fundsAddr,
      VestingVault: vestAddr,
      ReferralSystem: refAddr,
      SaleManager: smAddr,
    },
    notes: "SaleManager's internal vestingVault is placeholder. Use actual VestingVault when needed."
  };

  fs.writeFileSync(`deployments-${hre.network.name}.json`, JSON.stringify(info, null, 2));
  console.log("\n✅ Deployment saved!");
  
  console.log("\n═══════════════════════════════════════");
  console.log("  ALL CONTRACTS DEPLOYED");
  console.log("═══════════════════════════════════════");
  console.log("NEBA Token:", nebaToken);
  console.log("KYC Registry:", kycAddr);
  console.log("Rate Limiter:", rateAddr);
  console.log("Funds Vault:", fundsAddr);
  console.log("Vesting Vault:", vestAddr);
  console.log("Referral System:", refAddr);
  console.log("Sale Manager:", smAddr);
  
  console.log("\n⚠️  IMPORTANT: Round creation will use placeholder vesting vault.");
  console.log("This is a known circular dependency issue.");
  console.log("\nWorkaround: Create round and grant all necessary roles manually.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

