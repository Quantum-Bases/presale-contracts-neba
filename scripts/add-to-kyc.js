const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const deployment = JSON.parse(fs.readFileSync(`deployments-${hre.network.name}.json`, "utf8"));
  const kycRegistryAddress = deployment.contracts.KYCRegistry;
  const userAddress = "0xD3b146826834722771E4f6aC45efE0f438EF45c0";
  
  console.log("Adding to KYC whitelist:");
  console.log("  User:", userAddress);
  console.log("  KYC Registry:", kycRegistryAddress, "\n");
  
  const kycRegistry = await hre.ethers.getContractAt("KYCRegistry", kycRegistryAddress);
  
  const tx = await kycRegistry.addToWhitelist(userAddress);
  await tx.wait();
  
  console.log("✅ Added to whitelist! Tx:", tx.hash);
  
  const isApproved = await kycRegistry.isKYCApproved(userAddress);
  console.log("Verified:", isApproved ? "✅ Approved" : "❌ Not approved");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

