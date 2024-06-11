import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect, assert } from "chai";
import {
  pancakeswapRouterAddr,
  sushiswapRouterAddr,
  uniswapV2RouterAddr,
} from "../utils/addresses";

const nullAddress = "0x0000000000000000000000000000000000000000";

describe("FlashSwapUniswapV2 contract", () => {
  async function deployStoreValueContract() {
    const [owner, anotherAccount] = await hre.ethers.getSigners();

    const FlashSwapUniswapV2 = await hre.ethers.getContractFactory(
      "FlashSwapUniswapV2"
    );
    const flashSwap = await FlashSwapUniswapV2.deploy(owner);
    await flashSwap.addExchangeRouter("UNISWAP_V2", uniswapV2RouterAddr);
    await flashSwap.addExchangeRouter("SUSHISWAP", sushiswapRouterAddr);

    return { owner, anotherAccount, flashSwap };
  }

  describe("Deploy contract", () => {
    it("should deploy contract with correct owner", async () => {
      const { owner, anotherAccount, flashSwap } = await loadFixture(
        deployStoreValueContract
      );

      assert(flashSwap);
      expect(await flashSwap.owner()).to.equal(owner.address);
      expect(await flashSwap.owner()).not.to.equal(anotherAccount.address);
    });
  });

  describe("Exchange routers", () => {
    it("should returns list of registered exchanges", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);

      expect(await flashSwap.getExchanges()).to.deep.equals([
        "UNISWAP_V2",
        "SUSHISWAP",
      ]);
      expect(await flashSwap.exchangeRouters("UNISWAP_V2")).to.equal(
        uniswapV2RouterAddr
      );
      expect(await flashSwap.exchangeRouters("SUSHISWAP")).to.equal(
        sushiswapRouterAddr
      );
    });

    it("should the owner set exchange router", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await expect(
        flashSwap.addExchangeRouter("PANCAKESWAP", pancakeswapRouterAddr)
      ).not.to.be.rejected;
      expect(await flashSwap.exchangeRouters("PANCAKESWAP")).to.equal(
        pancakeswapRouterAddr
      );
      expect(await flashSwap.getExchanges()).to.deep.equal([
        "UNISWAP_V2",
        "SUSHISWAP",
        "PANCAKESWAP",
      ]);
    });

    it("should not allow non owner set exchange router", async () => {
      const { flashSwap, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      await expect(
        flashSwap
          .connect(anotherAccount)
          .addExchangeRouter("PANCAKESWAP", pancakeswapRouterAddr)
      ).to.be.rejected;
      expect(await flashSwap.getExchanges()).to.deep.equals([
        "UNISWAP_V2",
        "SUSHISWAP",
      ]);
    });

    it("should allow to remove exchange", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await expect(flashSwap.removeExchangeRouter("SUSHISWAP")).not.to.be
        .rejected;
      expect(await flashSwap.getExchanges()).to.deep.equals(["UNISWAP_V2"]);
      expect(await flashSwap.exchangeRouters("SUSHISWAP")).to.equal(
        nullAddress
      );
    });

    it("should not allow remove exchange to non owner account", async () => {
      const { flashSwap, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      await expect(
        flashSwap.connect(anotherAccount).removeExchangeRouter("SUSHISWAP")
      ).to.be.rejected;
      expect(await flashSwap.getExchanges()).to.deep.equals([
        "UNISWAP_V2",
        "SUSHISWAP",
      ]);
      expect(await flashSwap.exchangeRouters("SUSHISWAP")).to.equal(
        sushiswapRouterAddr
      );
    });
  });
});
