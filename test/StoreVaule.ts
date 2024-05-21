import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect } from "chai";

describe("StoreValue contract", () => {
  async function deployStoreValueContract() {
    const [owner, anotherAccount] = await hre.ethers.getSigners();

    const StoreValue = await hre.ethers.getContractFactory("StoreValue");
    const storeValue = await StoreValue.deploy(owner);

    const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
    const testERC20 = await TestERC20.deploy();

    return { owner, anotherAccount, storeValue, testERC20 };
  }

  describe("Deployment", () => {
    it("should deploy contract with correct owner", async () => {
      const { owner, anotherAccount, storeValue } = await loadFixture(
        deployStoreValueContract
      );
      expect(await storeValue.owner()).to.equal(owner.address);
      expect(await storeValue.owner()).not.to.equal(anotherAccount.address);
    });
  });

  describe("Balance ETH", () => {
    it("should return zero after deployment", async () => {
      const { storeValue } = await loadFixture(deployStoreValueContract);
      expect(await storeValue.getBalance()).to.equal(0);
    });

    it("should return the correct balance", async () => {
      const { storeValue, owner, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      await owner.sendTransaction({
        to: await storeValue.getAddress(),
        value: 1,
      });
      expect(await storeValue.getBalance()).to.equal(1);
      await anotherAccount.sendTransaction({
        to: await storeValue.getAddress(),
        value: 1,
      });
      expect(await storeValue.getBalance()).to.equal(2);
    });

    it("should show balance only to owner", async () => {
      const { storeValue, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      await expect(storeValue.getBalance()).to.not.be.rejected;
      await expect(storeValue.connect(anotherAccount).getBalance()).to.be
        .rejected;
    });
  });

  describe("Receiving ETH", () => {
    it("should receive ethers", async () => {
      const { storeValue, owner, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      await expect(
        owner.sendTransaction({
          to: await storeValue.getAddress(),
          value: 1,
        })
      ).to.emit(storeValue, "ReceivedETH");
      expect(await storeValue.getBalance()).to.equal(1);
      await expect(
        anotherAccount.sendTransaction({
          to: await storeValue.getAddress(),
          value: 1,
        })
      ).to.emit(storeValue, "ReceivedETH");
      expect(await storeValue.getBalance()).to.equal(2);
    });
  });

  describe("Withdraw ETH", () => {
    it("should allow to withdraw eth to owner", async () => {
      const { storeValue, owner } = await loadFixture(deployStoreValueContract);
      const value = hre.ethers.parseEther("1");
      await owner.sendTransaction({
        to: await storeValue.getAddress(),
        value,
      });
      expect(await storeValue.getBalance()).to.equal(value);
      await expect(storeValue.withdraw(value)).to.not.be.reverted;
      expect(await storeValue.getBalance()).to.equal(0);
    });

    it("should emit events after receive and withdraw ETHs", async () => {
      const { storeValue, owner } = await loadFixture(deployStoreValueContract);
      const value = hre.ethers.parseEther("1");
      await expect(
        owner.sendTransaction({
          to: await storeValue.getAddress(),
          value,
        })
      ).to.emit(storeValue, "ReceivedETH");
      await expect(storeValue.withdraw(value)).to.emit(
        storeValue,
        "WithdrawnETH"
      );
    });

    it("should not allow withdraw eth another accounts", async () => {
      const { storeValue, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      const value = hre.ethers.parseEther("1");
      await anotherAccount.sendTransaction({
        to: await storeValue.getAddress(),
        value,
      });
      expect(await storeValue.getBalance()).to.equal(value);
      await expect(storeValue.connect(anotherAccount).withdraw(value)).to.be
        .reverted;
      expect(await storeValue.getBalance()).to.equal(value);
    });
  });

  describe("Token Balance", () => {
    it("should return correct balance", async () => {
      const { storeValue, testERC20 } = await loadFixture(
        deployStoreValueContract
      );
      const erc20Address = await testERC20.getAddress();
      const storeAddress = await storeValue.getAddress();
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(0);
      await testERC20.transfer(storeAddress, 50);
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(50);
    });

    it("should not allow to get balance to not owner account", async () => {
      const { anotherAccount, storeValue, testERC20 } = await loadFixture(
        deployStoreValueContract
      );
      const erc20Address = await testERC20.getAddress();
      await expect(
        storeValue.connect(anotherAccount).getTokenBalance(erc20Address)
      ).to.be.reverted;
    });
  });

  describe("Receiving Token", () => {
    it("should receive tokens by owner", async () => {
      const { owner, storeValue, testERC20 } = await loadFixture(
        deployStoreValueContract
      );
      const storeAddress = await storeValue.getAddress();
      await expect(testERC20.transfer(storeAddress, 50)).changeTokenBalances(
        testERC20,
        [owner, storeAddress],
        [-50, 50]
      );
    });

    it("should receive tokens by another account", async () => {
      const { anotherAccount, storeValue, testERC20 } = await loadFixture(
        deployStoreValueContract
      );
      const storeAddress = await storeValue.getAddress();
      await testERC20.transfer(anotherAccount, 100);
      await expect(
        testERC20.connect(anotherAccount).transfer(storeAddress, 100)
      ).changeTokenBalances(
        testERC20,
        [anotherAccount, storeAddress],
        [-100, 100]
      );
    });
  });

  describe("Withdrawal Token", () => {
    it("should allow withdraw to owner", async () => {
      const { owner, storeValue, testERC20 } = await loadFixture(
        deployStoreValueContract
      );
      const erc20Address = await testERC20.getAddress();
      const storeAddress = await storeValue.getAddress();
      await testERC20.transfer(storeAddress, 1000);
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(1000);
      await expect(storeValue.withdrawTokens(erc20Address, 500)).to.emit(
        storeValue,
        "WithdrawnTokens"
      );
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(500);
      await expect(
        storeValue.withdrawTokens(erc20Address, 500)
      ).to.changeTokenBalances(testERC20, [storeAddress, owner], [-500, 500]);
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(0);
    });

    it("should not allow to withdraw token to another account", async () => {
      const { anotherAccount, storeValue, testERC20 } = await loadFixture(
        deployStoreValueContract
      );
      const erc20Address = await testERC20.getAddress();
      const storeAddress = await storeValue.getAddress();
      await testERC20.transfer(storeAddress, 1000);
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(1000);
      await expect(
        storeValue.connect(anotherAccount).withdrawTokens(erc20Address, 500)
      ).to.be.reverted;
      expect(await storeValue.getTokenBalance(erc20Address)).to.equal(1000);
    });
  });
});
