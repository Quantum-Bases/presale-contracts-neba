const hre = require("hardhat");
const fs = require("fs");

const BASE_USDC = "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176";
const BASE_USDT = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
const ETH_USD_ORACLE = "0xf7aE13dEb9a62bf8f263ADAAa4aF2c7e4cBB470e";

async function main() {
  console.log("=== Complete Deployment & Purchase Test ===\n");

  const [deployer] = await hre.ethers.getSigners();
  const multisig = deployer.address; // Use same for simplicity
  const nebaToken = process.env.NEBA_TOKEN_ADDRESS;

  console.log("Account:", deployer.address);
  console.log("NEBA Token:", nebaToken, "\n");

  // Deploy everything
  console.log("Deploying contracts...");
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

  const SaleManager = await hre.ethers.getContractFactory("SaleManager");
  const sm = await SaleManager.deploy(
    nebaToken, kycAddr, rateAddr, "0x0000000000000000000000000000000000000001", fundsAddr,
    BASE_USDC, BASE_USDT, ETH_USD_ORACLE, multisig
  );
  await sm.waitForDeployment();
  const smAddr = await sm.getAddress();

  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vv = await VestingVault.deploy(nebaToken, smAddr);
  await vv.waitForDeployment();
  const vvAddr = await vv.getAddress();

  const refAddr = await sm.referralSystem();

  console.log("✅ All deployed!\n");
  console.log("Sale Manager:", smAddr);
  console.log("Vesting Vault:", vvAddr);
  console.log("Referral System:", refAddr, "\n");

  // Create round
  console.log("Creating Private Sale round...");
  const config = {
    name: "Private Sale",
    tokenPriceUSD: 50000,
    hardCapUSD: hre.ethers.parseUnits("500000", 6),
    startTime: Math.floor(Date.now() / 1000),
    endTime: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
    cliffDuration: 180 * 24 * 60 * 60,
    vestingDuration: 365 * 24 * 60 * 60,
    isActive: true,
  };

  const createTx = await sm.createRound(config);
  const receipt = await createTx.wait();
  console.log("✅ Round created in block:", receipt.blockNumber);
  
  // Wait a moment and get round count
  const roundCount = await sm.getRoundCount();
  console.log("   Total rounds:", roundCount.toString());
  const roundAddr = await sm.getRound(Number(roundCount) - 1);
  console.log("   Round address:", roundAddr, "\n");

  // Grant roles
  console.log("Granting permissions...");
  await fundsVault.authorizeDepositor(roundAddr);
  await rateLimiter.grantRole(await rateLimiter.SALE_ROUND_ROLE(), roundAddr);
  await vv.grantRole(await vv.SALE_ROUND_ROLE(), roundAddr);
  const refSys = await hre.ethers.getContractAt("ReferralSystem", refAddr);
  await refSys.grantRole(await refSys.SALE_ROUND_ROLE(), roundAddr);
  console.log("✅ All roles granted\n");

  // Add to KYC
  console.log("Adding to KYC...");
  await kycRegistry.addToWhitelist(deployer.address);
  console.log("✅ KYC approved\n");

  // Purchase
  console.log("Purchasing 100 USDT worth of NEBA...");
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddr);
  const usdt = await hre.ethers.getContractAt("ERC20Mock", BASE_USDT);
  
  const amount = hre.ethers.parseUnits("100", 6);
  await usdt.mint(deployer.address, amount);
  await usdt.approve(roundAddr, amount);
  
  const purchaseTx = await saleRound.buyWithUSDT(amount, hre.ethers.ZeroAddress);
  await purchaseTx.wait();
  console.log("✅ PURCHASE SUCCESS!");
  console.log("   Tx:", purchaseTx.hash, "\n");

  const [contrib, alloc, bonus] = await saleRound.getUserInfo(deployer.address);
  console.log("🎉 YOUR ALLOCATION:");
  console.log("   Contributed: $" + hre.ethers.formatUnits(contrib, 6));
  console.log("   Tokens:", hre.ethers.formatEther(alloc), "NEBA");
  console.log("   Bonus:", hre.ethers.formatEther(bonus), "NEBA");

  console.log("\n✅ COMPLETE! Purchase worked successfully!");
  console.log("\nRound Address:", roundAddr);
  console.log("View on Basescan: https://sepolia.basescan.org/address/" + roundAddr);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

