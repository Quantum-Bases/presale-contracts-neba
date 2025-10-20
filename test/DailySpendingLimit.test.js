const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Daily Spending Limit", function () {
  let rateLimiter;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const RateLimiter = await ethers.getContractFactory("RateLimiter");
    rateLimiter = await RateLimiter.deploy(owner.address);
    await rateLimiter.waitForDeployment();
    
    // Grant SALE_ROUND_ROLE to owner for testing
    await rateLimiter.grantRole(await rateLimiter.SALE_ROUND_ROLE(), owner.address);
  });

  describe("Daily Spending Limit", function () {
    it("Should allow purchases within daily limit", async function () {
      const usdAmount = ethers.parseUnits("100", 6); // $100
      
      // First purchase should succeed
      await expect(rateLimiter.checkAndUpdateLimit(user1.address, usdAmount))
        .to.not.be.reverted;
      
      // Check that daily spending is tracked
      const limitInfo = await rateLimiter.getRateLimitInfo(user1.address);
      expect(limitInfo[3]).to.equal(usdAmount); // dailySpentUSD
    });

    it("Should block purchases that exceed daily limit", async function () {
      const usdAmount = ethers.parseUnits("300", 6); // $300
      const additionalAmount = ethers.parseUnits("250", 6); // $250
      
      // First purchase should succeed
      await rateLimiter.checkAndUpdateLimit(user1.address, usdAmount);
      
      // Fast forward to avoid frequency limit
      await ethers.provider.send("evm_increaseTime", [31]);
      await ethers.provider.send("evm_mine");
      
      // Second purchase should fail (300 + 250 = 550 > 500)
      await expect(rateLimiter.checkAndUpdateLimit(user1.address, additionalAmount))
        .to.be.revertedWith("RateLimiter: daily spending limit exceeded");
    });

    it("Should allow purchases up to exactly the daily limit", async function () {
      const usdAmount = ethers.parseUnits("500", 6); // $500
      
      // Purchase exactly at the limit should succeed
      await expect(rateLimiter.checkAndUpdateLimit(user1.address, usdAmount))
        .to.not.be.reverted;
      
      const limitInfo = await rateLimiter.getRateLimitInfo(user1.address);
      expect(limitInfo[3]).to.equal(usdAmount); // dailySpentUSD
    });

    it("Should reset daily spending after 24 hours", async function () {
      const usdAmount = ethers.parseUnits("500", 6); // $500
      
      // First purchase at limit
      await rateLimiter.checkAndUpdateLimit(user1.address, usdAmount);
      
      // Fast forward 24 hours + 1 second
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Should be able to purchase again
      await expect(rateLimiter.checkAndUpdateLimit(user1.address, usdAmount))
        .to.not.be.reverted;
      
      const limitInfo = await rateLimiter.getRateLimitInfo(user1.address);
      expect(limitInfo[3]).to.equal(usdAmount); // dailySpentUSD
    });

    it("Should track daily spending independently per user", async function () {
      const usdAmount = ethers.parseUnits("500", 6); // $500
      
      // Both users should be able to spend up to the limit
      await rateLimiter.checkAndUpdateLimit(user1.address, usdAmount);
      await rateLimiter.checkAndUpdateLimit(user2.address, usdAmount);
      
      const limitInfo1 = await rateLimiter.getRateLimitInfo(user1.address);
      const limitInfo2 = await rateLimiter.getRateLimitInfo(user2.address);
      
      expect(limitInfo1[3]).to.equal(usdAmount); // dailySpentUSD
      expect(limitInfo2[3]).to.equal(usdAmount); // dailySpentUSD
    });

    it("Should allow admin to update daily spending limit", async function () {
      const newLimit = ethers.parseUnits("1000", 6); // $1000
      
      await expect(rateLimiter.updateDailySpendingLimit(newLimit))
        .to.emit(rateLimiter, "DailySpendingLimitUpdated")
        .withArgs(newLimit);
      
      expect(await rateLimiter.maxDailySpendingUSD()).to.equal(newLimit);
    });

    it("Should reject invalid daily spending limit", async function () {
      await expect(rateLimiter.updateDailySpendingLimit(0))
        .to.be.revertedWith("RateLimiter: invalid daily spending limit");
    });

    it("Should only allow admin to update daily spending limit", async function () {
      const newLimit = ethers.parseUnits("1000", 6);
      
      await expect(rateLimiter.connect(user1).updateDailySpendingLimit(newLimit))
        .to.be.reverted;
    });
  });

  describe("Integration with existing rate limiting", function () {
    it("Should enforce both transaction frequency and daily spending limits", async function () {
      const usdAmount = ethers.parseUnits("100", 6); // $100
      
      // First purchase should succeed
      await rateLimiter.checkAndUpdateLimit(user1.address, usdAmount);
      
      // Immediate second purchase should fail due to frequency limit
      await expect(rateLimiter.checkAndUpdateLimit(user1.address, usdAmount))
        .to.be.revertedWith("RateLimiter: too frequent");
    });

    it("Should track both transaction count and daily spending", async function () {
      const usdAmount = ethers.parseUnits("50", 6); // $50
      
      // First transaction
      await rateLimiter.checkAndUpdateLimit(user1.address, usdAmount);
      
      // Fast forward to avoid frequency limit
      await ethers.provider.send("evm_increaseTime", [31]);
      await ethers.provider.send("evm_mine");
      
      // Second transaction
      await rateLimiter.checkAndUpdateLimit(user1.address, usdAmount);
      
      const limitInfo = await rateLimiter.getRateLimitInfo(user1.address);
      expect(limitInfo[1]).to.equal(2); // transactionCount
      expect(limitInfo[3]).to.equal(usdAmount * 2n); // dailySpentUSD
    });
  });
});
