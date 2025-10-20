const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Verifying all contracts on Basescan...\n");

  // Load deployment addresses
  const deploymentPath = `deployments-${hre.network.name}.json`;
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deployment.contracts;
  const multisig = deployment.multisig;
  const deployer = deployment.deployer;

  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer);
  console.log("Multisig:", multisig, "\n");

  // Base network addresses
  const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  const BASE_USDT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
  const ETH_USD_ORACLE = "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";

  try {
    // 1. Verify NEBA Token
    console.log("Verifying NEBAToken...");
    await hre.run("verify:verify", {
      address: contracts.NEBAToken,
      constructorArguments: [deployer],
    });
    console.log("✓ NEBAToken verified\n");
  } catch (error) {
    console.log("NEBAToken verification failed:", error.message, "\n");
  }

  try {
    // 2. Verify KYC Registry
    console.log("Verifying KYCRegistry...");
    await hre.run("verify:verify", {
      address: contracts.KYCRegistry,
      constructorArguments: [multisig],
    });
    console.log("✓ KYCRegistry verified\n");
  } catch (error) {
    console.log("KYCRegistry verification failed:", error.message, "\n");
  }

  try {
    // 3. Verify Rate Limiter
    console.log("Verifying RateLimiter...");
    await hre.run("verify:verify", {
      address: contracts.RateLimiter,
      constructorArguments: [multisig],
    });
    console.log("✓ RateLimiter verified\n");
  } catch (error) {
    console.log("RateLimiter verification failed:", error.message, "\n");
  }

  try {
    // 4. Verify Funds Vault
    console.log("Verifying FundsVault...");
    await hre.run("verify:verify", {
      address: contracts.FundsVault,
      constructorArguments: [multisig],
    });
    console.log("✓ FundsVault verified\n");
  } catch (error) {
    console.log("FundsVault verification failed:", error.message, "\n");
  }

  try {
    // 5. Verify Vesting Vault
    console.log("Verifying VestingVault...");
    await hre.run("verify:verify", {
      address: contracts.VestingVault,
      constructorArguments: [contracts.NEBAToken, contracts.SaleManager],
    });
    console.log("✓ VestingVault verified\n");
  } catch (error) {
    console.log("VestingVault verification failed:", error.message, "\n");
  }

  try {
    // 6. Verify Sale Manager
    console.log("Verifying SaleManager...");
    await hre.run("verify:verify", {
      address: contracts.SaleManager,
      constructorArguments: [
        contracts.NEBAToken,
        contracts.KYCRegistry,
        contracts.RateLimiter,
        contracts.VestingVault,
        contracts.FundsVault,
        BASE_USDC,
        BASE_USDT,
        ETH_USD_ORACLE,
        multisig,
      ],
    });
    console.log("✓ SaleManager verified\n");
  } catch (error) {
    console.log("SaleManager verification failed:", error.message, "\n");
  }

  // Verify sale rounds if they exist
  if (deployment.rounds && deployment.rounds.length > 0) {
    console.log("\nVerifying Sale Rounds...");
    for (const round of deployment.rounds) {
      try {
        console.log(`Verifying ${round.name}...`);
        // Note: Round constructor is complex, may need manual verification
        console.log(`Round address: ${round.address}`);
        console.log("Note: Sale rounds may need manual verification due to complex struct parameters\n");
      } catch (error) {
        console.log(`${round.name} verification failed:`, error.message, "\n");
      }
    }
  }

  console.log("Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

