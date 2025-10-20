# NEBA Presale Deployment Checklist

Complete checklist for deploying the NEBA presale system.

## Pre-Deployment

### 1. Prerequisites ✅
- [ ] Node.js v18+ installed
- [ ] NEBA Token contract already deployed
- [ ] Multisig wallet set up (recommend Gnosis Safe)
- [ ] Sufficient ETH for gas fees (~0.1 ETH on mainnet)
- [ ] Basescan API key obtained
- [ ] Hardware wallet for mainnet deployment

### 2. Environment Configuration ✅
- [ ] Create `.env` file from `ENV_TEMPLATE.md`
- [ ] Set `PRIVATE_KEY` (deployer account)
- [ ] Set `MULTISIG_ADDRESS` (governance wallet)
- [ ] Set `NEBA_TOKEN_ADDRESS` (your token contract)
- [ ] Set `BASE_RPC_URL` and `BASE_SEPOLIA_RPC_URL`
- [ ] Set `BASESCAN_API_KEY`
- [ ] Verify token contract exists: `npx hardhat run scripts/verify-token.js`

### 3. Test on Testnet First ✅
- [ ] Deploy to Base Sepolia: `npm run deploy:testnet`
- [ ] Verify all contracts: `npm run verify:all`
- [ ] Create test rounds: `npm run create-rounds`
- [ ] Test full purchase flow
- [ ] Test vesting and claiming
- [ ] Test emergency pause/unpause
- [ ] Test rate limiting

## Deployment Steps

### Step 1: Deploy Presale Contracts
```bash
# Review deployment script
cat scripts/deploy-complete.js

# Deploy to mainnet
npm run deploy:mainnet

# Save the output!
```

Expected output:
```
✓ KYC Registry deployed at: 0x...
✓ Rate Limiter deployed at: 0x...
✓ Funds Vault deployed at: 0x...
✓ Vesting Vault deployed at: 0x...
✓ Sale Manager deployed at: 0x...
```

**Deployment addresses saved to**: `deployments-base.json`

### Step 2: Transfer Tokens to VestingVault

**IMPORTANT**: VestingVault needs NEBA tokens to distribute!

```javascript
// From your NEBA token contract owner
// Transfer 300M tokens (or your presale allocation)
const amount = ethers.parseEther("300000000"); // 300M tokens
await nebaToken.transfer(VESTING_VAULT_ADDRESS, amount);
```

Or using cast:
```bash
cast send YOUR_NEBA_TOKEN \
  "transfer(address,uint256)" \
  VESTING_VAULT_ADDRESS \
  300000000000000000000000000 \
  --private-key $YOUR_TOKEN_OWNER_KEY \
  --rpc-url $BASE_RPC_URL
```

- [ ] Tokens transferred to VestingVault
- [ ] Verify balance: Check VestingVault has correct token balance

### Step 3: Verify Contracts on Basescan

```bash
npm run verify:all
```

- [ ] KYC Registry verified
- [ ] Rate Limiter verified
- [ ] Funds Vault verified
- [ ] Vesting Vault verified
- [ ] Sale Manager verified

### Step 4: Create Sale Rounds

Edit `scripts/create-rounds.js` with your round parameters, then:

```bash
npm run create-rounds
```

- [ ] Private Sale round created
- [ ] Community Sale round created
- [ ] Strategic Sale round created
- [ ] Public Sale round created

### Step 5: Configure Sale Rounds

**From Multisig**, authorize each round:

```javascript
// For each round (0, 1, 2, 3)
const roundAddress = await saleManager.getRound(roundIndex);

// 1. Authorize as depositor in FundsVault
await fundsVault.authorizeDepositor(roundAddress);

// 2. Grant SALE_ROUND_ROLE in RateLimiter
const SALE_ROUND_ROLE = await rateLimiter.SALE_ROUND_ROLE();
await rateLimiter.grantRole(SALE_ROUND_ROLE, roundAddress);
```

- [ ] Round 0 authorized in FundsVault
- [ ] Round 0 granted SALE_ROUND_ROLE
- [ ] Round 1 authorized in FundsVault
- [ ] Round 1 granted SALE_ROUND_ROLE
- [ ] Round 2 authorized in FundsVault
- [ ] Round 2 granted SALE_ROUND_ROLE
- [ ] Round 3 authorized in FundsVault
- [ ] Round 3 granted SALE_ROUND_ROLE

### Step 6: KYC Whitelist

Add initial KYC-approved addresses:

```bash
# Single address
node scripts/manage-kyc.js add 0xUserAddress

# Batch add
node scripts/manage-kyc.js batch-add 0xAddr1,0xAddr2,0xAddr3
```

- [ ] Initial whitelist added
- [ ] Verify whitelist: `node scripts/manage-kyc.js check 0xAddress`

## Post-Deployment Testing

### Test Purchase Flow

- [ ] Test USDC purchase (small amount)
- [ ] Test USDT purchase (small amount)
- [ ] Test ETH purchase (small amount)
- [ ] Verify tokens allocated correctly
- [ ] Verify funds received in FundsVault
- [ ] Verify vesting schedule created

### Verify Security

- [ ] Only multisig can withdraw from FundsVault
- [ ] Only multisig can pause rounds
- [ ] Rate limiting working correctly
- [ ] Only KYC-approved can purchase
- [ ] Timelock enforced on admin operations

## Monitoring Setup

### Create Monitoring Dashboard

- [ ] Monitor FundsVault balances (ETH, USDC, USDT)
- [ ] Monitor total raised per round
- [ ] Monitor rate limit triggers
- [ ] Monitor failed transactions
- [ ] Set up alerts for large purchases

### Set up Block Explorer Watching

- [ ] Add FundsVault to watch list
- [ ] Add Sale Rounds to watch list
- [ ] Enable email notifications

## Documentation

- [ ] Update team wiki with deployment addresses
- [ ] Document multisig procedures
- [ ] Create runbook for common operations
- [ ] Document emergency procedures

## Launch Preparation

### Communication

- [ ] Announce presale start date/time
- [ ] Publish contract addresses
- [ ] Share KYC application process
- [ ] Prepare FAQ document

### Team Training

- [ ] Train team on KYC approval process
- [ ] Train team on monitoring dashboard
- [ ] Practice emergency pause procedure
- [ ] Review withdrawal procedures

## Go-Live Checklist

**24 Hours Before Launch**:
- [ ] Final security review
- [ ] Test emergency pause (on testnet)
- [ ] Verify all multisig signers available
- [ ] Review round start times
- [ ] Confirm KYC whitelist ready

**Launch Day**:
- [ ] Monitor continuously
- [ ] Team on standby
- [ ] Ready to pause if needed
- [ ] Track first purchases
- [ ] Verify everything working

## Emergency Procedures

### If Something Goes Wrong

1. **Pause the affected round immediately**:
   ```javascript
   await saleManager.pauseRound(roundIndex);
   ```

2. **Assess the issue**:
   - Check transaction logs
   - Identify the problem
   - Determine if funds at risk

3. **Communicate**:
   - Notify team
   - Prepare user communication
   - Contact security experts if needed

4. **Fix and resume**:
   - Address the issue
   - Test thoroughly
   - Unpause when safe

## Post-Launch

### Week 1
- [ ] Daily monitoring
- [ ] Review all transactions
- [ ] Address user issues
- [ ] Optimize rate limits if needed

### Ongoing
- [ ] Weekly withdrawal schedule
- [ ] Monthly security review
- [ ] Update KYC whitelist regularly
- [ ] Monitor vesting claims
- [ ] Track for suspicious activity

---

## Key Contacts

- **Multisig Signers**: [List names and contacts]
- **Security Team**: [Contact info]
- **Development Team**: [Contact info]
- **Community Manager**: [Contact info]

## Important Links

- **Basescan**: https://basescan.org/
- **Deployments File**: `deployments-base.json`
- **Multisig Dashboard**: [Your Gnosis Safe URL]
- **Monitoring Dashboard**: [Your monitoring tool URL]

---

**Remember**: Take your time, verify everything, and test thoroughly. Security is paramount! 🔒

