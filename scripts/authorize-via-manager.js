const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Authorizing Round via Sale Manager ===\n");

  const [admin] = await hre.ethers.getSigners();
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  
  const saleManagerAddress = deployment.contracts.SaleManager;
  const vestingVaultAddress = deployment.contracts.VestingVault;
  const roundIndex = 0;
  
  console.log("Sale Manager:", saleManagerAddress);
  console.log("Admin:", admin.address, "\n");
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  const vestingVault = await hre.ethers.getContractAt("VestingVault", vestingVaultAddress);
  
  // Get round address
  const roundAddress = await saleManager.getRound(roundIndex);
  console.log("Round Address:", roundAddress, "\n");
  
  // Use SaleManager to grant role in VestingVault
  console.log("Using SaleManager to grant SALE_ROUND_ROLE in VestingVault...");
  
  const SALE_ROUND_ROLE = await vestingVault.SALE_ROUND_ROLE();
  
  // Encode the grantRole call
  const vestingVaultInterface = vestingVault.interface;
  const grantRoleData = vestingVaultInterface.encodeFunctionData("grantRole", [SALE_ROUND_ROLE, roundAddress]);
  
  // Call via SaleManager (which has admin role)
  const tx = await admin.sendTransaction({
    to: vestingVaultAddress,
    data: grantRoleData
  });
  
  console.log("Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Role granted!\n");
  
  // Verify
  const hasRole = await vestingVault.hasRole(SALE_ROUND_ROLE, roundAddress);
  console.log("Verification:");
  console.log("  Round has SALE_ROUND_ROLE in VestingVault:", hasRole ? "✅" : "❌");
  
  if (hasRole) {
    console.log("\n🎉 Success! Round is now fully functional!");
    console.log("\nYou can now:");
    console.log("  - Buy with USDC: await saleRound.buyWithUSDC(amount, referrer)");
    console.log("  - Buy with USDT: await saleRound.buyWithUSDT(amount, referrer)");
    console.log("  - Buy with ETH: await saleRound.buyWithETH(referrer, {value: amount})");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

