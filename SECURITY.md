# Security Policy

## Overview

The NEBA Presale system handles real financial assets and implements multiple security layers to protect user funds and ensure fair token distribution.

## Security Features

### 1. Access Control

- **Role-Based Access Control (RBAC)**: Using OpenZeppelin's AccessControl
  - `DEFAULT_ADMIN_ROLE`: Full administrative control
  - `KYC_MANAGER_ROLE`: KYC whitelist management
  - `RATE_ADMIN_ROLE`: Rate limiter configuration
  - `SALE_ROUND_ROLE`: Authorized to check rate limits

- **Multisig Control**: All critical operations require multisig approval
  - Fund withdrawals
  - Depositor authorization
  - Emergency pauses

### 2. Timelock Mechanism

All administrative actions enforced through a 2-day timelock:
- Parameter updates
- Configuration changes
- Pausing/unpausing rounds

This provides transparency and allows community oversight of changes.

### 3. Reentrancy Protection

- All external calls protected with OpenZeppelin's `ReentrancyGuard`
- Follows checks-effects-interactions pattern
- State updates before external calls

### 4. Anti-Bot Measures

**RateLimiter Contract** implements:
- Minimum time between transactions (default: 30 seconds)
- Maximum transactions per period (default: 10 per day)
- Per-address tracking
- Configurable parameters

### 5. KYC/Whitelist System

- Users must be KYC-approved before purchasing
- Batch operations for efficient whitelist management
- Revocable approvals

### 6. Immutable Architecture

- Contracts are non-upgradeable
- Only configuration parameters can be adjusted
- Core logic cannot be changed post-deployment

### 7. SafeMath & Safe Operations

- Using Solidity 0.8.24 with built-in overflow protection
- OpenZeppelin's SafeERC20 for token transfers
- Explicit zero-address checks

### 8. Pausable Rounds

- Emergency pause functionality per round
- Managed by SaleManager
- Allows immediate response to threats

## Known Limitations

1. **Oracle Dependency**: ETH price feed depends on Chainlink oracle availability
2. **Immutability**: No upgradeable pattern means bugs require redeployment
3. **Vesting Circular Dependency**: VestingVault and SaleManager have circular dependency requiring careful deployment order

## Best Practices for Deployment

### Pre-Deployment

1. **Audit**: Conduct professional security audit
2. **Testing**: Extensive testing on testnet
3. **Multisig Setup**: Use battle-tested multisig (Gnosis Safe recommended)
4. **Key Management**: Use hardware wallets for all production keys

### Post-Deployment

1. **Monitoring**: Continuous monitoring of all contract interactions
2. **Rate Limit Tuning**: Adjust based on legitimate user patterns
3. **Incident Response**: Have emergency procedures documented
4. **Regular Reviews**: Periodic security reviews

## Operational Security

### Private Keys

- **Never** commit private keys to version control
- Use hardware wallets for production
- Multisig for all critical operations
- Separate keys for different roles

### Transaction Verification

Before executing critical transactions:
1. Verify recipient addresses
2. Double-check amounts (decimals!)
3. Simulate transaction with Cast/Tenderly
4. Have multiple people review

### Monitoring Checklist

Monitor for:
- [ ] Unusual purchase patterns
- [ ] Large transactions
- [ ] Rate limit triggers
- [ ] Failed transactions
- [ ] Oracle price deviations
- [ ] Contract balance changes

## Incident Response

### If Vulnerability Discovered

1. **Assess Severity**: Immediate risk to funds?
2. **Pause if Necessary**: Use emergency pause
3. **Notify Team**: Alert all stakeholders
4. **Plan Response**: Coordinate with security experts
5. **Execute Fix**: Deploy mitigation
6. **Post-Mortem**: Document and learn

### Emergency Contacts

- Multisig signers: [List contact methods]
- Security team: [Contact info]
- External auditors: [Contact info]

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. **DO NOT** exploit the vulnerability
3. **DO** contact the team privately at: [security@example.com]
4. **DO** provide detailed reproduction steps
5. **DO** allow reasonable time for response

### Responsible Disclosure

We follow a responsible disclosure policy:
- Acknowledge report within 48 hours
- Provide initial assessment within 7 days
- Work with reporter on fix timeline
- Credit researcher (if desired) after fix

## Audit History

| Date | Auditor | Scope | Report |
|------|---------|-------|--------|
| TBD | TBD | Full system | Link TBD |

## Bug Bounty

[Details of bug bounty program if implemented]

## Security Assumptions

The system assumes:
1. Base network operates correctly
2. Chainlink oracles provide accurate prices
3. ERC20 tokens (USDC, USDT) behave as expected
4. Multisig signers act honestly
5. Private keys remain secure

## Testing

### Test Coverage

Run tests with coverage:
```bash
forge coverage
```

Target: >95% line coverage

### Fuzzing

Contracts include fuzzing tests:
```bash
forge test --fuzz-runs 10000
```

### Invariant Testing

Key invariants tested:
- Total raised ≤ hard cap
- Token allocations = (USD raised / token price)
- Vesting vault balance ≥ outstanding vested tokens
- Funds vault balance = sum of deposits - withdrawals

## Security Tools Used

- **Slither**: Static analysis
- **Mythril**: Symbolic execution
- **Foundry**: Testing framework
- **OpenZeppelin**: Security-audited libraries

## Updates and Maintenance

This security policy is reviewed:
- After any security incident
- Before major updates
- Quarterly minimum

Last Updated: [Date]
Version: 1.0

---

**Remember**: Security is everyone's responsibility. If something seems wrong, speak up!

