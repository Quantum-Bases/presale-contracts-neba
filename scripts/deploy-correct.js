const hre = require("hardhat");
const fs = require("fs");

// Test token addresses
const BASE_USDC_TESTNET = "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176";
const BASE_USDT_TESTNET = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
const ETH_USD_ORACLE_TESTNET = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e";

async function main() {
  console.log("=== NEBA Presale - CORRECT Deployment ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const multisig = process.env.MULTISIG_ADDRESS;
  const nebaToken = process.env.NEBA_TOKEN_ADDRESS;

  console.log("Deployer:", deployer.address, "\n");

  // Step 1: Infrastructure
  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = await KYCRegistry.deploy(multisig);
  await kycRegistry.waitForDeployment();
  const kycAddr = await kycRegistry.getAddress();
  console.log("1. KYC Registry:", kycAddr);

  const RateLimiter = await hre.ethers.getContractFactory("RateLimiter");
  const rateLimiter = await RateLimiter.deploy(multisig);
  await rateLimiter.waitForDeployment();
  const rateAddr = await rateLimiter.getAddress();
  console.log("2. Rate Limiter:", rateAddr);

  const FundsVault = await hre.ethers.getContractFactory("FundsVault");
  const fundsVault = await FundsVault.deploy(multisig);
  await fundsVault.waitForDeployment();
  const fundsAddr = await fundsVault.getAddress();
  console.log("3. Funds Vault:", fundsAddr, "\n");

  // Step 2: Deploy SaleManager AND VestingVault together
  console.log("Solving circular dependency...");
  
  // Deploy SaleManager with itself as placeholder
  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const tempAddr = "0x0000000000000000000000000000000000000001";
  const sm1 = await SaleManager.deploy(
    nebaToken, kycAddr, rateAddr, tempAddr, fundsAddr,
    BASE_USDC_TESTNET, BASE_USDT_TESTNET, ETH_USD_ORACLE_TESTNET, multisig
  );
  await sm1.waitForDeployment();
  const sm1Addr = await sm1.getAddress();
  console.log("4. SaleManager (temp):", sm1Addr);

  // Deploy VestingVault with SaleManager
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vv1 = await VestingVault.deploy(nebaToken, sm1Addr);
  await vv1.waitForDeployment();
  const vv1Addr = await vv1.getAddress();
  console.log("5. VestingVault (with SM1):", vv1Addr);

  // Deploy FINAL SaleManager with correct VestingVault
  const smFinal = await SaleManager.deploy(
    nebaToken, kycAddr, rateAddr, vv1Addr, fundsAddr,
    BASE_USDC_TESTNET, BASE_USDT_TESTNET, ETH_USD_ORACLE_TESTNET, multisig
  );
  await smFinal.waitForDeployment();
  const smFinalAddr = await smFinal.getAddress();
  console.log("6. SaleManager (FINAL):", smFinalAddr);

  // Deploy FINAL VestingVault with FINAL SaleManager
  const vvFinal = await VestingVault.deploy(nebaToken, smFinalAddr);
  await vvFinal.waitForDeployment();
  const vvFinalAddr = await vvFinal.getAddress();
  console.log("7. VestingVault (FINAL):", vvFinalAddr);

  const refAddr = await smFinal.referralSystem();
  console.log("8. Referral System:", refAddr, "\n");

  // Save final addresses
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
      VestingVault: vvFinalAddr,
      ReferralSystem: refAddr,
      SaleManager: smFinalAddr,
    }
  };

  fs.writeFileSync(`deployments-${hre.network.name}.json`, JSON.stringify(info, null, 2));
  
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("\nNow create round:");
  console.log("  npx hardhat run scripts/create-private-sale.js --network baseSepolia");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

