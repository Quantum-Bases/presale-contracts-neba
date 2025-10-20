const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || !["add", "remove", "check", "batch-add"].includes(command)) {
    console.log("Usage:");
    console.log("  node scripts/manage-kyc.js add <address>");
    console.log("  node scripts/manage-kyc.js remove <address>");
    console.log("  node scripts/manage-kyc.js check <address>");
    console.log("  node scripts/manage-kyc.js batch-add <address1>,<address2>,...");
    process.exit(1);
  }

  // Load deployment addresses
  const deploymentPath = `deployments-${hre.network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const kycRegistryAddress = deployment.contracts.KYCRegistry;

  console.log("Network:", hre.network.name);
  console.log("KYC Registry:", kycRegistryAddress, "\n");

  const [signer] = await hre.ethers.getSigners();
  console.log("Using account:", signer.address, "\n");

  const KYCRegistry = await hre.ethers.getContractFactory("KYCRegistry");
  const kycRegistry = KYCRegistry.attach(kycRegistryAddress);

  switch (command) {
    case "add":
      const addAddress = args[1];
      if (!addAddress) {
        console.error("Error: Address required");
        process.exit(1);
      }
      console.log("Adding to whitelist:", addAddress);
      const addTx = await kycRegistry.addToWhitelist(addAddress);
      await addTx.wait();
      console.log("✓ Address added to whitelist");
      console.log("Transaction:", addTx.hash);
      break;

    case "remove":
      const removeAddress = args[1];
      if (!removeAddress) {
        console.error("Error: Address required");
        process.exit(1);
      }
      console.log("Removing from whitelist:", removeAddress);
      const removeTx = await kycRegistry.removeFromWhitelist(removeAddress);
      await removeTx.wait();
      console.log("✓ Address removed from whitelist");
      console.log("Transaction:", removeTx.hash);
      break;

    case "check":
      const checkAddress = args[1];
      if (!checkAddress) {
        console.error("Error: Address required");
        process.exit(1);
      }
      const isApproved = await kycRegistry.isKYCApproved(checkAddress);
      console.log("Address:", checkAddress);
      console.log("KYC Approved:", isApproved ? "✓ Yes" : "✗ No");
      break;

    case "batch-add":
      const addresses = args[1];
      if (!addresses) {
        console.error("Error: Addresses required (comma-separated)");
        process.exit(1);
      }
      const addressList = addresses.split(",").map(a => a.trim());
      console.log("Adding addresses to whitelist:");
      addressList.forEach(addr => console.log("  -", addr));
      const batchTx = await kycRegistry.batchAddToWhitelist(addressList);
      await batchTx.wait();
      console.log(`✓ ${addressList.length} addresses added to whitelist`);
      console.log("Transaction:", batchTx.hash);
      break;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

