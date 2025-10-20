# NEBA Token Presale System

A comprehensive, secure presale contract system for the $NEBA token on Base network. This system supports multiple sale rounds with configurable parameters, multi-cryptocurrency payments (USDC, USDT, ETH), and sophisticated vesting mechanisms.

## 🎯 Features

### Core Functionality
- **Multi-Currency Support**: Accept payments in USDC, USDT, and ETH
- **Flexible Sale Rounds**: Unlimited configurable rounds (Private, Community, Strategic, Public)
- **Advanced Vesting**: Cliff and linear vesting schedules per round
- **KYC Integration**: Built-in whitelist management for compliance
- **Anti-Bot Protection**: Rate limiting and transaction frequency controls

### Security Features
- **Timelock Mechanism**: 2-day delay on administrative actions
- **Multisig Controlled**: All withdrawals and critical operations require multisig
- **Reentrancy Guards**: Protection against reentrancy attacks
- **Pausable Rounds**: Emergency pause functionality
- **Non-Upgradeable**: Immutable contracts with only configuration parameters adjustable

## 📋 Contracts Overview

| Contract | Purpose |
|----------|---------|
| **NEBAToken** | ERC20 token with controlled minting |
| **SaleManager** | Creates and manages sale rounds, timelock operations |
| **SaleRound** | Handles individual round purchases and token allocation |
| **VestingVault** | Manages cliff and linear token vesting |
| **FundsVault** | Secure storage for ETH/USDC/USDT proceeds |
| **KYCRegistry** | Whitelist management for KYC compliance |
| **RateLimiter** | Anti-bot protection with transaction limits |

## 🚀 Installation

### Prerequisites

```bash
# Install Node.js (v18 or higher recommended)
# Download from https://nodejs.org/

# Verify installation
node --version
npm --version
```

### Setup Project

```bash
# Navigate to project directory
cd nebaPresale

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your values
# Then compile contracts
npm run compile
```

## 🔧 Configuration

### Environment Setup

Edit `.env` file:

```env
# Deployment private key
PRIVATE_KEY=your_private_key_here

# RPC URLs
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Basescan API key for verification
BASESCAN_API_KEY=your_basescan_api_key

# Multisig wallet address
MULTISIG_ADDRESS=0x_your_multisig_address
```

## 📦 Deployment

### Deploy to Base Sepolia (Testnet)

```bash
npm run deploy:testnet
```

### Deploy to Base Mainnet

```bash
npm run deploy:mainnet
```

### Deployment Output

Contract addresses will be saved to `deployments-<network>.json`:

```json
{
  "network": "base",
  "contracts": {
    "NEBAToken": "0x...",
    "KYCRegistry": "0x...",
    "RateLimiter": "0x...",
    "FundsVault": "0x...",
    "VestingVault": "0x...",
    "SaleManager": "0x..."
  }
}
```

## 🎪 Creating Sale Rounds

```bash
# After deployment, create rounds
npm run create-rounds
```

This creates 4 default rounds:
- **Private Sale**: $0.05, $500K cap, 6mo cliff, 12mo vest
- **Community Sale**: $0.08, $800K cap, 3mo cliff, 9mo vest
- **Strategic Sale**: $0.10, $1M cap, 2mo cliff, 6mo vest
- **Public Sale**: $0.15, $1.5M cap, 1mo cliff, 4mo vest

## 👥 KYC Whitelist Management

### Using the Script

```bash
# Add single address
node scripts/manage-kyc.js add 0xUserAddress

# Remove address
node scripts/manage-kyc.js remove 0xUserAddress

# Check KYC status
node scripts/manage-kyc.js check 0xUserAddress

# Batch add
node scripts/manage-kyc.js batch-add 0xAddr1,0xAddr2,0xAddr3
```

### Using Hardhat Console

```bash
npx hardhat console --network base
```

```javascript
const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
const registry = KYCRegistry.attach("0xKYCRegistryAddress");

// Add to whitelist
await registry.addToWhitelist("0xUserAddress");

// Check status
await registry.isKYCApproved("0xUserAddress");
```

## 💰 User Purchase Flow

### 1. Get KYC Approved

Users must be whitelisted before participating.

### 2. Purchase with USDC/USDT

```javascript
// Approve token
const usdc = await ethers.getContractAt("IERC20", usdcAddress);
await usdc.approve(saleRoundAddress, amount);

// Purchase
const saleRound = await ethers.getContractAt("SaleRound", saleRoundAddress);
await saleRound.buyWithUSDC(amount);
```

### 3. Purchase with ETH

```javascript
const saleRound = await ethers.getContractAt("SaleRound", saleRoundAddress);
await saleRound.buyWithETH({ value: ethers.parseEther("1.0") });
```

### 4. Claim Vested Tokens

After round ends and cliff period:

```javascript
const vestingVault = await ethers.getContractAt("VestingVault", vestingVaultAddress);
await vestingVault.claimVested();
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run coverage
npm run test:coverage
```

## 🔐 Multisig Operations

### Withdraw Funds

```javascript
// In Hardhat console
const fundsVault = await ethers.getContractAt("FundsVault", fundsVaultAddress);

// Withdraw ETH
await fundsVault.withdrawETH(recipientAddress, ethers.parseEther("10"));

// Withdraw USDC
await fundsVault.withdrawToken(usdcAddress, recipientAddress, amount);
```

### Emergency Pause

```javascript
const saleManager = await ethers.getContractAt("SaleManager", saleManagerAddress);
await saleManager.pauseRound(0); // Pause round index 0
```

## 📊 Rate Limiting

Default limits:
- **Min time between tx**: 30 seconds
- **Max tx per period**: 10
- **Period**: 24 hours

Update via multisig:

```javascript
const rateLimiter = await ethers.getContractAt("RateLimiter", rateLimiterAddress);
await rateLimiter.updateRateLimitConfig(
  60,      // 60 seconds between tx
  5,       // 5 tx max
  172800   // 48 hour period
);
```

## 🔄 Timelock Operations

For critical parameter changes:

```javascript
const saleManager = await ethers.getContractAt("SaleManager", saleManagerAddress);

// 1. Schedule operation
const target = saleRoundAddress;
const data = saleRound.interface.encodeFunctionData("updateConfig", [newConfig]);
const tx = await saleManager.scheduleOperation(target, data);
const receipt = await tx.wait();

// 2. Wait 2 days...

// 3. Execute operation
await saleManager.executeOperation(operationId);
```

## 📈 Monitoring

### Check Round Status

```javascript
const saleRound = await ethers.getContractAt("SaleRound", saleRoundAddress);
const info = await saleRound.getRoundInfo();
const totalRaised = await saleRound.totalRaisedUSD();
const tokensSold = await saleRound.totalTokensSold();
```

### Check User Info

```javascript
const [contribution, allocation] = await saleRound.getUserInfo(userAddress);
console.log("Contributed:", ethers.formatUnits(contribution, 6), "USD");
console.log("Allocated:", ethers.formatEther(allocation), "NEBA");
```

### Check Vesting

```javascript
const vestingVault = await ethers.getContractAt("VestingVault", vestingVaultAddress);
const claimable = await vestingVault.getClaimableAmount(userAddress);
console.log("Claimable:", ethers.formatEther(claimable), "NEBA");
```

## 📝 Available Scripts

```bash
npm run compile        # Compile contracts
npm test              # Run tests
npm run test:gas      # Run tests with gas report
npm run test:coverage # Generate coverage report
npm run deploy:testnet # Deploy to testnet
npm run deploy:mainnet # Deploy to mainnet
npm run create-rounds # Create sale rounds
npm run verify:all    # Verify all contracts
npm run node          # Start local Hardhat node
npm run clean         # Clean artifacts
```

## 🔒 Security Considerations

1. **Multisig Wallet**: Use Gnosis Safe for the multisig address
2. **Private Key Security**: Never commit private keys
3. **Timelock**: All critical operations have 2-day delay
4. **Audit**: Consider professional audit before mainnet
5. **Testing**: Thoroughly test on testnet
6. **Rate Limits**: Monitor and adjust based on usage
7. **Oracle Security**: Verify Chainlink oracle addresses

## 📝 Base Network Addresses

### Mainnet
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **USDT**: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`
- **ETH/USD Oracle**: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`

## 🐛 Troubleshooting

### "Module not found"

```bash
rm -rf node_modules package-lock.json
npm install
```

### "Invalid nonce"

```bash
# Reset account nonce in Hardhat
# Or wait a few blocks
```

### Verification Failed

```bash
# Verify manually
npx hardhat verify --network base CONTRACT_ADDRESS CONSTRUCTOR_ARGS
```

## 📄 License

MIT License

## 📞 Support

For questions and support:
- Review documentation
- Check test files for examples
- Test on testnet first

---

**⚠️ Important**: This system handles real value. Always:
- Test thoroughly on testnet
- Use multisig for production
- Keep private keys secure
- Consider professional audit
- Monitor all operations

## 🔗 Additional Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started quickly
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Detailed deployment steps
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture
- **[SECURITY.md](./SECURITY.md)** - Security policy
