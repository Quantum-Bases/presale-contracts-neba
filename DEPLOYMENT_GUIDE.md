# NEBA Presale Deployment Guide

Complete step-by-step guide for deploying the NEBA presale system to Base network.

## Pre-Deployment Checklist

- [ ] Foundry installed and updated
- [ ] Multisig wallet deployed (recommend Gnosis Safe)
- [ ] Private key secured (use hardware wallet for production)
- [ ] Base RPC endpoint configured
- [ ] Basescan API key obtained
- [ ] Sufficient ETH for gas fees
- [ ] All parameters reviewed and verified

## Step 1: Environment Setup

### Install Dependencies

```bash
# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Build contracts
forge build
```

### Configure Environment

Create `.env` file:

```env
PRIVATE_KEY=your_deployer_private_key
MULTISIG_ADDRESS=0xYourMultisigAddress
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_api_key
```

Load environment:

```bash
source .env
```

## Step 2: Deploy Contracts

### Option A: Complete Deployment (Recommended)

```bash
forge script script/DeployComplete.s.sol:DeployComplete \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

This deploys all contracts in the correct order with proper initialization.

### Option B: Manual Deployment

If you need more control, deploy each contract individually:

#### 1. Deploy NEBA Token

```bash
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/NEBAToken.sol:NEBAToken \
  --constructor-args $DEPLOYER_ADDRESS
```

#### 2. Deploy KYC Registry

```bash
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/KYCRegistry.sol:KYCRegistry \
  --constructor-args $MULTISIG_ADDRESS
```

#### 3. Deploy Rate Limiter

```bash
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/RateLimiter.sol:RateLimiter \
  --constructor-args $MULTISIG_ADDRESS
```

#### 4. Deploy Funds Vault

```bash
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/FundsVault.sol:FundsVault \
  --constructor-args $MULTISIG_ADDRESS
```

#### 5. Deploy Sale Manager

```bash
BASE_USDC=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
BASE_USDT=0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
ETH_USD_ORACLE=0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70

# Note: Use temporary address for vesting vault, will redeploy
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/SaleManager.sol:SaleManager \
  --constructor-args \
    $NEBA_TOKEN \
    $KYC_REGISTRY \
    $RATE_LIMITER \
    $TEMP_VESTING_VAULT \
    $FUNDS_VAULT \
    $BASE_USDC \
    $BASE_USDT \
    $ETH_USD_ORACLE \
    $MULTISIG_ADDRESS
```

#### 6. Deploy Vesting Vault

```bash
forge create --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  src/VestingVault.sol:VestingVault \
  --constructor-args $NEBA_TOKEN $SALE_MANAGER
```

#### 7. Redeploy Sale Manager with correct Vesting Vault

Repeat step 5 with the correct vesting vault address.

## Step 3: Post-Deployment Configuration

### 1. Grant Roles

```bash
# Grant SALE_ROUND_ROLE to future sale rounds (done automatically when creating rounds)

# Grant KYC_MANAGER_ROLE to KYC admin if needed
KYC_MANAGER_ROLE=$(cast keccak "KYC_MANAGER_ROLE")
cast send $KYC_REGISTRY \
  "grantRole(bytes32,address)" \
  $KYC_MANAGER_ROLE \
  $KYC_ADMIN_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 2. Authorize Depositors

```bash
# The FundsVault needs to authorize each SaleRound as a depositor
# This is done after creating each round (see Step 4)
```

### 3. Mint Tokens for Presale

```bash
# Mint tokens to VestingVault for distribution
# Example: 300M tokens for presale
cast send $NEBA_TOKEN \
  "mint(address,uint256)" \
  $VESTING_VAULT \
  300000000000000000000000000 \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 4. Transfer Token Ownership

```bash
cast send $NEBA_TOKEN \
  "transferOwnership(address)" \
  $MULTISIG_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Step 4: Create Sale Rounds

### Option A: Use Script

Edit `script/CreateRounds.s.sol` with your parameters, then:

```bash
export SALE_MANAGER=0x...

forge script script/CreateRounds.s.sol:CreateRounds \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  -vvvv
```

### Option B: Create Manually

#### Create Private Sale Round

```bash
START_TIME=$(date +%s)
END_TIME=$((START_TIME + 2592000)) # 30 days

cast send $SALE_MANAGER \
  "createRound((string,uint256,uint256,uint256,uint256,uint256,uint256,bool))" \
  "('Private Sale',50000,500000000000,$START_TIME,$END_TIME,15552000,31104000,true)" \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

Parameters breakdown:
- `'Private Sale'`: Round name
- `50000`: $0.05 token price (6 decimals)
- `500000000000`: $500,000 hard cap (6 decimals)
- `$START_TIME`: Current timestamp
- `$END_TIME`: End timestamp
- `15552000`: 180 days cliff (in seconds)
- `31104000`: 360 days vesting (in seconds)
- `true`: Is active

### Authorize Round as Depositor

After creating each round, authorize it to deposit to FundsVault:

```bash
# Get the round address
ROUND_ADDRESS=$(cast call $SALE_MANAGER "getRound(uint256)(address)" 0 --rpc-url $BASE_RPC_URL)

# Authorize from multisig
cast send $FUNDS_VAULT \
  "authorizeDepositor(address)" \
  $ROUND_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY
```

### Grant SALE_ROUND_ROLE to Round

```bash
SALE_ROUND_ROLE=$(cast keccak "SALE_ROUND_ROLE")

cast send $RATE_LIMITER \
  "grantRole(bytes32,address)" \
  $SALE_ROUND_ROLE \
  $ROUND_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY
```

## Step 5: KYC Whitelist Setup

### Add Initial Whitelist

```bash
# Single address
cast send $KYC_REGISTRY \
  "addToWhitelist(address)" \
  0xUserAddress \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY

# Batch addresses
cast send $KYC_REGISTRY \
  "batchAddToWhitelist(address[])" \
  "[0xAddr1,0xAddr2,0xAddr3]" \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Step 6: Verification

### Verify All Contracts Deployed

```bash
# Check each contract
cast code $NEBA_TOKEN --rpc-url $BASE_RPC_URL
cast code $KYC_REGISTRY --rpc-url $BASE_RPC_URL
cast code $RATE_LIMITER --rpc-url $BASE_RPC_URL
cast code $FUNDS_VAULT --rpc-url $BASE_RPC_URL
cast code $VESTING_VAULT --rpc-url $BASE_RPC_URL
cast code $SALE_MANAGER --rpc-url $BASE_RPC_URL
```

### Verify Round Created

```bash
# Get round count
cast call $SALE_MANAGER "getRoundCount()(uint256)" --rpc-url $BASE_RPC_URL

# Get round address
cast call $SALE_MANAGER "getRound(uint256)(address)" 0 --rpc-url $BASE_RPC_URL

# Check round info
cast call $ROUND_ADDRESS "getRoundInfo()" --rpc-url $BASE_RPC_URL
```

### Verify Permissions

```bash
# Check multisig is owner
cast call $NEBA_TOKEN "owner()(address)" --rpc-url $BASE_RPC_URL
cast call $FUNDS_VAULT "multisig()(address)" --rpc-url $BASE_RPC_URL

# Check depositor authorization
cast call $FUNDS_VAULT "authorizedDepositors(address)(bool)" $ROUND_ADDRESS --rpc-url $BASE_RPC_URL
```

## Step 7: Test Purchase Flow

### Test with Small Amount

```bash
# From a KYC-approved test address
# Approve USDC
cast send $BASE_USDC \
  "approve(address,uint256)" \
  $ROUND_ADDRESS \
  1000000 \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY

# Purchase
cast send $ROUND_ADDRESS \
  "buyWithUSDC(uint256)" \
  1000000 \
  --rpc-url $BASE_RPC_URL \
  --private-key $TEST_USER_PRIVATE_KEY

# Check allocation
cast call $ROUND_ADDRESS \
  "getUserInfo(address)(uint256,uint256)" \
  $TEST_USER_ADDRESS \
  --rpc-url $BASE_RPC_URL
```

## Step 8: Monitoring Setup

### Create Monitoring Script

Save as `monitor.sh`:

```bash
#!/bin/bash

echo "=== NEBA Presale Monitor ==="
echo ""
echo "Round Status:"
cast call $SALE_MANAGER "getRoundCount()(uint256)" --rpc-url $BASE_RPC_URL
echo ""

for i in {0..3}; do
  ROUND=$(cast call $SALE_MANAGER "getRound(uint256)(address)" $i --rpc-url $BASE_RPC_URL 2>/dev/null)
  if [ ! -z "$ROUND" ]; then
    echo "Round $i: $ROUND"
    echo "  Total Raised:"
    cast call $ROUND "totalRaisedUSD()(uint256)" --rpc-url $BASE_RPC_URL
    echo "  Tokens Sold:"
    cast call $ROUND "totalTokensSold()(uint256)" --rpc-url $BASE_RPC_URL
    echo ""
  fi
done

echo "Funds Vault Balances:"
echo "  ETH: $(cast balance $FUNDS_VAULT --rpc-url $BASE_RPC_URL)"
echo "  USDC: $(cast call $BASE_USDC "balanceOf(address)(uint256)" $FUNDS_VAULT --rpc-url $BASE_RPC_URL)"
echo "  USDT: $(cast call $BASE_USDT "balanceOf(address)(uint256)" $FUNDS_VAULT --rpc-url $BASE_RPC_URL)"
```

Make executable and run:

```bash
chmod +x monitor.sh
./monitor.sh
```

## Emergency Procedures

### Pause a Round

```bash
cast send $SALE_MANAGER \
  "pauseRound(uint256)" \
  0 \
  --rpc-url $BASE_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY
```

### Unpause a Round

```bash
cast send $SALE_MANAGER \
  "unpauseRound(uint256)" \
  0 \
  --rpc-url $BASE_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY
```

### Emergency Withdraw

```bash
# Withdraw ETH
cast send $FUNDS_VAULT \
  "withdrawETH(address,uint256)" \
  $SAFE_ADDRESS \
  $AMOUNT \
  --rpc-url $BASE_RPC_URL \
  --private-key $MULTISIG_PRIVATE_KEY
```

## Final Checklist

- [ ] All contracts deployed and verified on Basescan
- [ ] Token ownership transferred to multisig
- [ ] All rounds created with correct parameters
- [ ] Sale rounds authorized as depositors
- [ ] Initial KYC whitelist populated
- [ ] Test purchase successful
- [ ] Monitoring scripts configured
- [ ] Emergency procedures documented
- [ ] Multisig signers trained
- [ ] Public announcement prepared

## Post-Launch

1. **Monitor continuously**: Watch for unusual activity
2. **KYC management**: Keep whitelist updated
3. **Community support**: Answer user questions promptly
4. **Funds management**: Plan withdrawal schedule
5. **Vesting tracking**: Monitor claim periods
6. **Rate limit tuning**: Adjust based on legitimate usage patterns

## Support

For deployment issues:
1. Check logs with `-vvvv` flag
2. Verify all addresses are correct
3. Ensure sufficient gas and funds
4. Test on Sepolia first
5. Review contract state with Cast calls

---

**Remember**: This is production deployment handling real value. Take your time, verify everything, and test thoroughly on testnet first.

