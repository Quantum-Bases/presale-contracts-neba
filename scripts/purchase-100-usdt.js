const hre = require("hardhat");

async function main() {
  console.log("=== Purchasing NEBA with 100 USDT ===\n");

  const investorAddress = "0xD3b146826834722771E4f6aC45efE0f438EF45c0";
  const roundAddress = "0x3C32ab6dbb0567b77cBd379E983F04693a55f300";
  const usdtAddress = "0xe4124421ada579bD3F81FbBdF460DC1C6Cb310E0";
  const purchaseAmount = hre.ethers.parseUnits("100", 6); // 100 USDT
  
  const [signer] = await hre.ethers.getSigners();
  console.log("Investor Address:", investorAddress);
  console.log("Current Signer:", signer.address);
  console.log("Purchase Amount: 100 USDT\n");
  
  if (signer.address.toLowerCase() !== investorAddress.toLowerCase()) {
    console.log("⚠️  Warning: Signer doesn't match investor address!");
    console.log("Make sure your .env PRIVATE_KEY matches the investor address.\n");
  }
  
  // Get contracts
  const saleRound = await hre.ethers.getContractAt("SaleRound", roundAddress);
  const usdt = await hre.ethers.getContractAt("ERC20Mock", usdtAddress);
  
  // Step 1: Check USDT balance
  console.log("Step 1: Checking USDT balance...");
  const balance = await usdt.balanceOf(signer.address);
  console.log("   Current Balance:", hre.ethers.formatUnits(balance, 6), "USDT");
  
  if (balance < purchaseAmount) {
    console.log("   ⚠️  Not enough USDT! Minting more...");
    const mintTx = await usdt.mint(signer.address, purchaseAmount);
    await mintTx.wait();
    const newBalance = await usdt.balanceOf(signer.address);
    console.log("   ✅ Minted! New Balance:", hre.ethers.formatUnits(newBalance, 6), "USDT");
  } else {
    console.log("   ✅ Sufficient balance");
  }
  
  // Step 2: Approve USDT
  console.log("\nStep 2: Approving USDT...");
  const currentAllowance = await usdt.allowance(signer.address, roundAddress);
  console.log("   Current Allowance:", hre.ethers.formatUnits(currentAllowance, 6), "USDT");
  
  if (currentAllowance < purchaseAmount) {
    const approveTx = await usdt.approve(roundAddress, purchaseAmount);
    await approveTx.wait();
    console.log("   ✅ Approved 100 USDT");
    console.log("   Tx:", approveTx.hash);
  } else {
    console.log("   ✅ Already approved");
  }
  
  // Step 3: Check allocation before purchase
  console.log("\nStep 3: Checking allocation before purchase...");
  const [contribBefore, allocBefore, bonusBefore] = await saleRound.getUserInfo(signer.address);
  console.log("   Contribution: $" + hre.ethers.formatUnits(contribBefore, 6));
  console.log("   Tokens:", hre.ethers.formatEther(allocBefore), "NEBA");
  console.log("   Bonus:", hre.ethers.formatEther(bonusBefore), "NEBA");
  
  // Step 4: Purchase (without referral)
  console.log("\nStep 4: Purchasing tokens...");
  console.log("   Amount: 100 USDT ($100)");
  console.log("   Expected tokens: 2,000 NEBA ($100 / $0.05)");
  console.log("   Referrer: None (no bonus)");
  
  try {
    const purchaseTx = await saleRound.buyWithUSDT(
      purchaseAmount,
      hre.ethers.ZeroAddress  // No referral
    );
    console.log("   Transaction sent:", purchaseTx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await purchaseTx.wait();
    console.log("   ✅ Purchase confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // Step 5: Check new allocation
    console.log("\nStep 5: Checking new allocation...");
    const [contribAfter, allocAfter, bonusAfter] = await saleRound.getUserInfo(signer.address);
    console.log("   Total Contribution: $" + hre.ethers.formatUnits(contribAfter, 6));
    console.log("   Total Tokens:", hre.ethers.formatEther(allocAfter), "NEBA");
    console.log("   Total Bonus:", hre.ethers.formatEther(bonusAfter), "NEBA");
    
    const tokensReceived = allocAfter - allocBefore;
    console.log("\n   📊 This Purchase:");
    console.log("      Tokens Received:", hre.ethers.formatEther(tokensReceived), "NEBA");
    
    // Check round stats
    const totalRaised = await saleRound.totalRaisedUSD();
    const totalTokensSold = await saleRound.totalTokensSold();
    console.log("\n   📈 Round Statistics:");
    console.log("      Total Raised: $" + hre.ethers.formatUnits(totalRaised, 6));
    console.log("      Total Tokens Sold:", hre.ethers.formatEther(totalTokensSold), "NEBA");
    
    console.log("\n🎉 Purchase Successful!");
    console.log("\nView transaction on Basescan:");
    console.log("   https://sepolia.basescan.org/tx/" + purchaseTx.hash);
    
  } catch (error) {
    console.error("\n❌ Purchase failed!");
    console.error("Error:", error.message);
    
    if (error.message.includes("not KYC approved")) {
      console.log("\n💡 Fix: Add to KYC whitelist");
      console.log("   node scripts/manage-kyc.js add " + signer.address);
    } else if (error.message.includes("not authorized")) {
      console.log("\n💡 Fix: Grant SALE_ROUND_ROLE");
      console.log("   Run: npx hardhat run scripts/fix-all-permissions.js --network baseSepolia");
    } else if (error.message.includes("allowance")) {
      console.log("\n💡 Fix: Approve USDT first");
      console.log("   await usdt.approve(roundAddress, amount)");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

