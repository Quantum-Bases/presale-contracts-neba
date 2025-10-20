const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Testing NEBA Purchase with Referral System ===\n");

  const [buyer] = await hre.ethers.getSigners();
  const buyerAddress = buyer.address;
  
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const roundAddress = "0xf77fbffed698008edD790fCfDb6ea3F95610Cc96";
  const usdcAddress = "0xfe411b74c2AA728ed17CFcCf1FA0144599b55176";
  const usdtAddress = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
  
  console.log("Buyer:", buyerAddress);
  console.log("Round:", roundAddress);
  console.log("Mock USDC:", usdcAddress);
  console.log("Mock USDT:", usdtAddress, "\n");
  
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const usdc = await hre.ethers.getContractAt("ERC20Mock", usdcAddress);
  
  // Check KYC
  const kycRegistry = await hre.ethers.getContractAt("KYCRegistry", deployment.contracts.KYCRegistry);
  const isKYCApproved = await kycRegistry.isKYCApproved(buyerAddress);
  
  if (!isKYCApproved) {
    console.log("❌ You are not KYC approved!");
    console.log("Adding you to whitelist...\n");
    const tx = await kycRegistry.addToWhitelist(buyerAddress);
    await tx.wait();
    console.log("✅ Added to KYC whitelist\n");
  } else {
    console.log("✅ You are KYC approved\n");
  }
  
  // Test 1: Purchase with USDC (no referral)
  console.log("═══════════════════════════════════════");
  console.log("  TEST 1: Purchase with USDC (No Referral)");
  console.log("═══════════════════════════════════════\n");
  
  const usdcAmount = hre.ethers.parseUnits("100", 6); // $100
  
  // Mint USDC to buyer
  console.log("1. Minting 100 USDC...");
  await usdc.mint(buyerAddress, usdcAmount);
  console.log("   ✅ Minted\n");
  
  // Approve
  console.log("2. Approving USDC...");
  const approveTx = await usdc.approve(roundAddress, usdcAmount);
  await approveTx.wait();
  console.log("   ✅ Approved\n");
  
  // Purchase without referral (use zero address)
  console.log("3. Purchasing tokens...");
  console.log("   Amount: $100 USDC");
  console.log("   Referrer: None (0x0000...)");
  
  const purchaseTx = await saleRound.buyWithUSDC(
    usdcAmount, 
    ethers.ZeroAddress // No referral
  );
  console.log("   Transaction sent:", purchaseTx.hash);
  const receipt = await purchaseTx.wait();
  console.log("   ✅ Purchase confirmed! Block:", receipt.blockNumber, "\n");
  
  // Check allocation
  const [contribution, allocation, bonus] = await saleRound.getUserInfo(buyerAddress);
  console.log("4. Your Allocation:");
  console.log("   Contributed: $" + hre.ethers.formatUnits(contribution, 6));
  console.log("   Tokens Allocated:", hre.ethers.formatEther(allocation), "NEBA");
  console.log("   Bonus Tokens:", hre.ethers.formatEther(bonus), "NEBA");
  console.log("   Total:", hre.ethers.formatEther(allocation), "NEBA (no referral bonus)\n");
  
  // Test 2: Purchase with ETH (with referral)
  console.log("═══════════════════════════════════════");
  console.log("  TEST 2: Purchase with ETH (With Referral)");
  console.log("═══════════════════════════════════════\n");
  
  const referrerAddress = "0xE5D483C25EA00ebaB949AC760334bb92774A4C23"; // Example referrer
  
  console.log("1. Purchasing with ETH...");
  console.log("   Amount: 0.01 ETH");
  console.log("   Referrer:", referrerAddress);
  console.log("   Expected: ETH price * 0.01 = $2000 * 0.01 = $20");
  console.log("   Tokens: $20 / $0.05 = 400 NEBA");
  console.log("   Referee bonus: 400 * 5% = 20 NEBA");
  console.log("   Referrer bonus: 400 * 5% = 20 NEBA\n");
  
  try {
    const ethPurchaseTx = await saleRound.buyWithETH(
      referrerAddress, // With referral!
      { value: hre.ethers.parseEther("0.01") }
    );
    console.log("   Transaction sent:", ethPurchaseTx.hash);
    const ethReceipt = await ethPurchaseTx.wait();
    console.log("   ✅ Purchase confirmed! Block:", ethReceipt.blockNumber, "\n");
    
    // Check new allocation
    const [contrib2, alloc2, bonus2] = await saleRound.getUserInfo(buyerAddress);
    const [refContrib, refAlloc, refBonus] = await saleRound.getUserInfo(referrerAddress);
    
    console.log("2. Your New Allocation:");
    console.log("   Total Contributed: $" + hre.ethers.formatUnits(contrib2, 6));
    console.log("   Total Tokens:", hre.ethers.formatEther(alloc2), "NEBA");
    console.log("   Total Bonus:", hre.ethers.formatEther(bonus2), "NEBA (includes 5% referee bonus!)");
    
    console.log("\n3. Referrer's Allocation:");
    console.log("   Total Tokens:", hre.ethers.formatEther(refAlloc), "NEBA");
    console.log("   Referral Bonus:", hre.ethers.formatEther(refBonus), "NEBA (5% of your purchase!)");
    
    console.log("\n🎉 ETH Purchase with Referral Successful!");
    
  } catch (error) {
    console.log("   ❌ ETH Purchase failed:", error.message);
  }
  
  console.log("\n═══════════════════════════════════════");
  console.log("  📝 SUMMARY: How to Buy with Referral");
  console.log("═══════════════════════════════════════");
  console.log("\n✅ USDC Purchase:");
  console.log("   await saleRound.buyWithUSDC(amount, referrerAddress)");
  console.log("\n✅ USDT Purchase:");
  console.log("   await saleRound.buyWithUSDT(amount, referrerAddress)");
  console.log("\n✅ ETH Purchase:");
  console.log("   await saleRound.buyWithETH(referrerAddress, { value: ethAmount })");
  console.log("\n💡 To buy WITHOUT referral, use:");
  console.log("   ethers.ZeroAddress  (0x0000000000000000000000000000000000000000)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

