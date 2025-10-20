# Environment Variables Template

Create a `.env` file in the project root with the following variables:

```env
# ====================
# REQUIRED FOR DEPLOYMENT
# ====================

# Private key for deployment (with or without 0x prefix)
# This account will deploy all presale contracts
PRIVATE_KEY=your_private_key_here

# Multisig address for governance
# This address will control the presale system
MULTISIG_ADDRESS=0x_your_multisig_address

# NEBA Token address
# Your already deployed NEBA token contract address
NEBA_TOKEN_ADDRESS=0x_your_neba_token_address

# ====================
# NETWORK RPC URLs
# ====================

# Base Mainnet RPC
BASE_RPC_URL=https://mainnet.base.org

# Base Sepolia Testnet RPC
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# ====================
# CONTRACT VERIFICATION
# ====================

# Basescan API key for contract verification
# Get your API key from: https://basescan.org/myapikey
BASESCAN_API_KEY=your_basescan_api_key_here

# ====================
# OPTIONAL SETTINGS
# ====================

# Enable gas reporting in tests
REPORT_GAS=false

# CoinMarketCap API key for gas price in USD
COINMARKETCAP_API_KEY=

# Enable network forking for testing
FORK_ENABLED=false
```

## How to Set Up

1. **Copy this template**:
   ```bash
   # Create your .env file
   touch .env
   ```

2. **Fill in your values**:
   - Get your private key from MetaMask/wallet
   - Set your multisig address (use Gnosis Safe)
   - Add your NEBA token contract address
   - Get Basescan API key from https://basescan.org/myapikey

3. **Security**:
   - ⚠️ **NEVER commit `.env` to git!**
   - The `.gitignore` file already excludes it
   - Use a separate deployer account (not your main wallet)
   - For mainnet, use a hardware wallet

## Example Values (Testnet)

```env
PRIVATE_KEY=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
MULTISIG_ADDRESS=0x1234567890123456789012345678901234567890
NEBA_TOKEN_ADDRESS=0x0987654321098765432109876543210987654321
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=ABC123XYZ789
REPORT_GAS=true
```

## Verification

After creating your `.env` file, verify it's correct:

```bash
# Test that environment loads
node -e "require('dotenv').config(); console.log('NEBA Token:', process.env.NEBA_TOKEN_ADDRESS)"
```

## Next Steps

After setting up `.env`:
1. Deploy presale contracts: `npm run deploy:testnet`
2. Transfer tokens to VestingVault
3. Create sale rounds: `npm run create-rounds`
4. Start accepting purchases!

