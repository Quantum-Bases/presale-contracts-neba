const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("FundsVault", function () {
  async function deployFundsVaultFixture() {
    const [multisig, depositor, user, recipient] = await ethers.getSigners();
    
    // Deploy mock ERC20
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Mock.deploy("Test Token", "TEST");
    await token.waitForDeployment();
    
    const FundsVault = await ethers.getContractFactory("FundsVault");
    const vault = await FundsVault.deploy(multisig.address);
    await vault.waitForDeployment();
    
    await vault.connect(multisig).authorizeDepositor(depositor.address);
    
    return { vault, token, multisig, depositor, user, recipient };
  }

  describe("Deployment", function () {
    it("Should set the correct multisig", async function () {
      const { vault, multisig } = await loadFixture(deployFundsVaultFixture);
      expect(await vault.multisig()).to.equal(multisig.address);
    });

    it("Should authorize depositor", async function () {
      const { vault, depositor } = await loadFixture(deployFundsVaultFixture);
      expect(await vault.authorizedDepositors(depositor.address)).to.be.true;
    });
  });

  describe("Depositor Management", function () {
    it("Should authorize new depositor", async function () {
      const { vault, multisig, user } = await loadFixture(deployFundsVaultFixture);
      
      await vault.connect(multisig).authorizeDepositor(user.address);
      expect(await vault.authorizedDepositors(user.address)).to.be.true;
    });

    it("Should revoke depositor authorization", async function () {
      const { vault, multisig, depositor } = await loadFixture(deployFundsVaultFixture);
      
      await vault.connect(multisig).revokeDepositor(depositor.address);
      expect(await vault.authorizedDepositors(depositor.address)).to.be.false;
    });

    it("Should revert when non-multisig authorizes depositor", async function () {
      const { vault, user } = await loadFixture(deployFundsVaultFixture);
      
      await expect(
        vault.connect(user).authorizeDepositor(user.address)
      ).to.be.revertedWith("FundsVault: not multisig");
    });
  });

  describe("ETH Deposits", function () {
    it("Should deposit ETH", async function () {
      const { vault, depositor } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1");
      
      await vault.connect(depositor).depositETH({ value: amount });
      
      expect(await vault.getETHBalance()).to.equal(amount);
    });

    it("Should revert when unauthorized deposits ETH", async function () {
      const { vault, user } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1");
      
      await expect(
        vault.connect(user).depositETH({ value: amount })
      ).to.be.revertedWith("FundsVault: not authorized");
    });

    it("Should revert when depositing zero ETH", async function () {
      const { vault, depositor } = await loadFixture(deployFundsVaultFixture);
      
      await expect(
        vault.connect(depositor).depositETH({ value: 0 })
      ).to.be.revertedWith("FundsVault: zero amount");
    });

    it("Should revert when sending ETH directly", async function () {
      const { vault, user } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1");
      
      await expect(
        user.sendTransaction({ to: await vault.getAddress(), value: amount })
      ).to.be.revertedWith("FundsVault: use depositETH");
    });
  });

  describe("Token Deposits", function () {
    it("Should deposit tokens", async function () {
      const { vault, token, depositor } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1000");
      
      await token.mint(depositor.address, amount);
      await token.connect(depositor).approve(await vault.getAddress(), amount);
      await vault.connect(depositor).depositToken(await token.getAddress(), amount);
      
      expect(await vault.getTokenBalance(await token.getAddress())).to.equal(amount);
    });

    it("Should revert when unauthorized deposits tokens", async function () {
      const { vault, token, user } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1000");
      
      await expect(
        vault.connect(user).depositToken(await token.getAddress(), amount)
      ).to.be.revertedWith("FundsVault: not authorized");
    });
  });

  describe("ETH Withdrawals", function () {
    it("Should withdraw ETH", async function () {
      const { vault, multisig, depositor, recipient } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1");
      
      await vault.connect(depositor).depositETH({ value: amount });
      
      const balanceBefore = await ethers.provider.getBalance(recipient.address);
      await vault.connect(multisig).withdrawETH(recipient.address, amount);
      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      
      expect(balanceAfter - balanceBefore).to.equal(amount);
      expect(await vault.getETHBalance()).to.equal(0);
    });

    it("Should revert when non-multisig withdraws ETH", async function () {
      const { vault, user, recipient } = await loadFixture(deployFundsVaultFixture);
      
      await expect(
        vault.connect(user).withdrawETH(recipient.address, ethers.parseEther("1"))
      ).to.be.revertedWith("FundsVault: not multisig");
    });
  });

  describe("Token Withdrawals", function () {
    it("Should withdraw tokens", async function () {
      const { vault, token, multisig, depositor, recipient } = await loadFixture(deployFundsVaultFixture);
      const amount = ethers.parseEther("1000");
      
      await token.mint(depositor.address, amount);
      await token.connect(depositor).approve(await vault.getAddress(), amount);
      await vault.connect(depositor).depositToken(await token.getAddress(), amount);
      
      await vault.connect(multisig).withdrawToken(
        await token.getAddress(),
        recipient.address,
        amount
      );
      
      expect(await token.balanceOf(recipient.address)).to.equal(amount);
      expect(await vault.getTokenBalance(await token.getAddress())).to.equal(0);
    });

    it("Should revert when non-multisig withdraws tokens", async function () {
      const { vault, token, user, recipient } = await loadFixture(deployFundsVaultFixture);
      
      await expect(
        vault.connect(user).withdrawToken(
          await token.getAddress(),
          recipient.address,
          1000
        )
      ).to.be.revertedWith("FundsVault: not multisig");
    });
  });
});

