const hre = require("hardhat");

async function main() {
  const [currentAccount] = await hre.ethers.getSigners();
  console.log("Current Account:", currentAccount.address, "\n");

  const saleManagerAddress = "0x2E6B8eC708FDc1303154A75ec94e7E6f0Fe7C5E1";
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  
  const owner = await saleManager.owner();
  console.log("SaleManager Owner:", owner);
  console.log("Current Account:", currentAccount.address);
  console.log("\nMatch:", owner.toLowerCase() === currentAccount.address.toLowerCase() ? "✅ YES - You can create rounds!" : "❌ NO - You cannot create rounds");
  
  if (owner.toLowerCase() !== currentAccount.address.toLowerCase()) {
    console.log("\n⚠️ Problem: Your current account is not the owner!");
    console.log("\nTo fix this, you need to either:");
    console.log("1. Use the owner's private key in your .env PRIVATE_KEY");
    console.log("2. Redeploy the contracts with your new multisig address");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

