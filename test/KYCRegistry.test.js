const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("KYCRegistry", function () {
  async function deployKYCRegistryFixture() {
    const [admin, kycManager, user1, user2, user3] = await ethers.getSigners();
    
    const KYCRegistry = await ethers.getContractFactory("KYCRegistry");
    const registry = await KYCRegistry.deploy(admin.address);
    await registry.waitForDeployment();
    
    const KYC_MANAGER_ROLE = await registry.KYC_MANAGER_ROLE();
    const DEFAULT_ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
    
    await registry.grantRole(KYC_MANAGER_ROLE, kycManager.address);
    
    return { registry, admin, kycManager, user1, user2, user3, KYC_MANAGER_ROLE, DEFAULT_ADMIN_ROLE };
  }

  describe("Deployment", function () {
    it("Should set the correct admin", async function () {
      const { registry, admin, DEFAULT_ADMIN_ROLE } = await loadFixture(deployKYCRegistryFixture);
      expect(await registry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should grant KYC manager role to admin", async function () {
      const { registry, admin, KYC_MANAGER_ROLE } = await loadFixture(deployKYCRegistryFixture);
      expect(await registry.hasRole(KYC_MANAGER_ROLE, admin.address)).to.be.true;
    });
  });

  describe("Whitelist Management", function () {
    it("Should add address to whitelist", async function () {
      const { registry, kycManager, user1 } = await loadFixture(deployKYCRegistryFixture);
      
      await registry.connect(kycManager).addToWhitelist(user1.address);
      expect(await registry.isKYCApproved(user1.address)).to.be.true;
    });

    it("Should remove address from whitelist", async function () {
      const { registry, kycManager, user1 } = await loadFixture(deployKYCRegistryFixture);
      
      await registry.connect(kycManager).addToWhitelist(user1.address);
      await registry.connect(kycManager).removeFromWhitelist(user1.address);
      
      expect(await registry.isKYCApproved(user1.address)).to.be.false;
    });

    it("Should batch add addresses to whitelist", async function () {
      const { registry, kycManager, user1, user2, user3 } = await loadFixture(deployKYCRegistryFixture);
      
      const addresses = [user1.address, user2.address, user3.address];
      await registry.connect(kycManager).batchAddToWhitelist(addresses);
      
      expect(await registry.isKYCApproved(user1.address)).to.be.true;
      expect(await registry.isKYCApproved(user2.address)).to.be.true;
      expect(await registry.isKYCApproved(user3.address)).to.be.true;
    });

    it("Should batch remove addresses from whitelist", async function () {
      const { registry, kycManager, user1, user2 } = await loadFixture(deployKYCRegistryFixture);
      
      const addresses = [user1.address, user2.address];
      await registry.connect(kycManager).batchAddToWhitelist(addresses);
      await registry.connect(kycManager).batchRemoveFromWhitelist(addresses);
      
      expect(await registry.isKYCApproved(user1.address)).to.be.false;
      expect(await registry.isKYCApproved(user2.address)).to.be.false;
    });
  });

  describe("Access Control", function () {
    it("Should revert when non-manager tries to add to whitelist", async function () {
      const { registry, user1, user2 } = await loadFixture(deployKYCRegistryFixture);
      
      await expect(
        registry.connect(user1).addToWhitelist(user2.address)
      ).to.be.reverted;
    });

    it("Should revert when adding zero address", async function () {
      const { registry, kycManager } = await loadFixture(deployKYCRegistryFixture);
      
      await expect(
        registry.connect(kycManager).addToWhitelist(ethers.ZeroAddress)
      ).to.be.revertedWith("KYCRegistry: zero address");
    });

    it("Should revert when adding already whitelisted address", async function () {
      const { registry, kycManager, user1 } = await loadFixture(deployKYCRegistryFixture);
      
      await registry.connect(kycManager).addToWhitelist(user1.address);
      
      await expect(
        registry.connect(kycManager).addToWhitelist(user1.address)
      ).to.be.revertedWith("KYCRegistry: already whitelisted");
    });

    it("Should revert when removing non-whitelisted address", async function () {
      const { registry, kycManager, user1 } = await loadFixture(deployKYCRegistryFixture);
      
      await expect(
        registry.connect(kycManager).removeFromWhitelist(user1.address)
      ).to.be.revertedWith("KYCRegistry: not whitelisted");
    });
  });

  describe("Events", function () {
    it("Should emit AddressWhitelisted event", async function () {
      const { registry, kycManager, user1 } = await loadFixture(deployKYCRegistryFixture);
      
      await expect(registry.connect(kycManager).addToWhitelist(user1.address))
        .to.emit(registry, "AddressWhitelisted")
        .withArgs(user1.address);
    });

    it("Should emit AddressRemovedFromWhitelist event", async function () {
      const { registry, kycManager, user1 } = await loadFixture(deployKYCRegistryFixture);
      
      await registry.connect(kycManager).addToWhitelist(user1.address);
      
      await expect(registry.connect(kycManager).removeFromWhitelist(user1.address))
        .to.emit(registry, "AddressRemovedFromWhitelist")
        .withArgs(user1.address);
    });
  });
});

