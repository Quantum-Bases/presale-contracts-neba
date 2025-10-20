const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("RateLimiter", function () {
  async function deployRateLimiterFixture() {
    const [admin, saleRound, user1] = await ethers.getSigners();
    
    const RateLimiter = await ethers.getContractFactory("RateLimiter");
    const limiter = await RateLimiter.deploy(admin.address);
    await limiter.waitForDeployment();
    
    const SALE_ROUND_ROLE = await limiter.SALE_ROUND_ROLE();
    const RATE_ADMIN_ROLE = await limiter.RATE_ADMIN_ROLE();
    
    await limiter.grantRole(SALE_ROUND_ROLE, saleRound.address);
    
    return { limiter, admin, saleRound, user1, SALE_ROUND_ROLE, RATE_ADMIN_ROLE };
  }

  describe("Deployment", function () {
    it("Should set correct initial parameters", async function () {
      const { limiter } = await loadFixture(deployRateLimiterFixture);
      
      expect(await limiter.minTimeBetweenTx()).to.equal(30);
      expect(await limiter.maxTxPerPeriod()).to.equal(10);
      expect(await limiter.period()).to.equal(86400); // 1 day
    });
  });

  describe("Rate Limiting", function () {
    it("Should allow first transaction", async function () {
      const { limiter, saleRound, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      
      const info = await limiter.getRateLimitInfo(user1.address);
      expect(info[1]).to.equal(1); // txCount
    });

    it("Should revert when transaction too frequent", async function () {
      const { limiter, saleRound, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      
      await expect(
        limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0)
      ).to.be.revertedWith("RateLimiter: too frequent");
    });

    it("Should allow transaction after minimum time", async function () {
      const { limiter, saleRound, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      
      await time.increase(31); // Wait 31 seconds
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      
      const info = await limiter.getRateLimitInfo(user1.address);
      expect(info[1]).to.equal(2); // txCount
    });

    it("Should revert when period limit exceeded", async function () {
      const { limiter, saleRound, user1 } = await loadFixture(deployRateLimiterFixture);
      
      // Make 10 transactions (the limit)
      for (let i = 0; i < 10; i++) {
        await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
        await time.increase(31);
      }
      
      // 11th should fail
      await expect(
        limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0)
      ).to.be.revertedWith("RateLimiter: period limit exceeded");
    });

    it("Should reset after period expires", async function () {
      const { limiter, saleRound, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      
      // Warp to next period
      await time.increase(86401); // 1 day + 1 second
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      
      const info = await limiter.getRateLimitInfo(user1.address);
      expect(info[1]).to.equal(1); // Should reset to 1, txCount
    });
  });

  describe("Configuration", function () {
    it("Should update rate limit configuration", async function () {
      const { limiter, admin } = await loadFixture(deployRateLimiterFixture);
      
      await limiter.connect(admin).updateRateLimitConfig(60, 5, 172800);
      
      expect(await limiter.minTimeBetweenTx()).to.equal(60);
      expect(await limiter.maxTxPerPeriod()).to.equal(5);
      expect(await limiter.period()).to.equal(172800);
    });

    it("Should reset user limit", async function () {
      const { limiter, admin, saleRound, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await limiter.connect(saleRound).checkAndUpdateLimit(user1.address, 0);
      await limiter.connect(admin).resetLimit(user1.address);
      
      const info = await limiter.getRateLimitInfo(user1.address);
      expect(info[0]).to.equal(0); // lastTxTime
      expect(info[1]).to.equal(0); // txCount
    });
  });

  describe("Access Control", function () {
    it("Should revert when non-authorized checks limit", async function () {
      const { limiter, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await expect(
        limiter.connect(user1).checkAndUpdateLimit(user1.address, 0)
      ).to.be.reverted;
    });

    it("Should revert when non-admin updates config", async function () {
      const { limiter, user1 } = await loadFixture(deployRateLimiterFixture);
      
      await expect(
        limiter.connect(user1).updateRateLimitConfig(60, 5, 172800)
      ).to.be.reverted;
    });
  });
});

