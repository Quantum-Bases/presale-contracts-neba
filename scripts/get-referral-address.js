const hre = require("hardhat");

async function main() {
  const saleManagerAddress = "0x2E6B8eC708FDc1303154A75ec94e7E6f0Fe7C5E1";
  
  const saleManager = await hre.ethers.getContractAt("SaleManager", saleManagerAddress);
  const referralSystemAddress = await saleManager.referralSystem();
  
  console.log("ReferralSystem deployed at:", referralSystemAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

