import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { assert, expect } from "chai";
import {
  sushiswapFactoryAddr,
  sushiswapRouterAddr,
  uniswapV2FactoryAddr,
  uniswapV2RouterAddr,
} from "../utils/addresses";

const nullAddress = "0x0000000000000000000000000000000000000000";

describe("DEX registry", () => {
  async function deployDEXRegistryContract() {
    const [owner] = await hre.ethers.getSigners();

    const DEXRegistry = await hre.ethers.getContractFactory("DEXRegistry");
    const dexRegistry = await DEXRegistry.deploy();

    return { owner, dexRegistry };
  }

  describe("Deploy contract", () => {
    it("should deploy DEXRegistry contract", async () => {
      const { dexRegistry } = await loadFixture(deployDEXRegistryContract);
      assert(dexRegistry);
    });
  });

  describe("Register a descentralized exchange", async () => {
    it("should register a DEX", async () => {
      const { dexRegistry } = await loadFixture(deployDEXRegistryContract);

      expect(await dexRegistry.getDEXs()).to.deep.equal([]);

      await dexRegistry.addDEX(
        "UNISWAP_V2",
        uniswapV2RouterAddr,
        uniswapV2FactoryAddr,
        0
      );

      expect(await dexRegistry.getDEXs()).to.deep.equal(["UNISWAP_V2"]);
      expect(await dexRegistry.dexInfo("UNISWAP_V2")).to.deep.equal([
        uniswapV2RouterAddr,
        uniswapV2FactoryAddr,
        0,
      ]);
    });

    it("should not register a duplicated DEX", async () => {
      const { dexRegistry } = await loadFixture(deployDEXRegistryContract);
      await dexRegistry.addDEX(
        "UNISWAP_V2",
        uniswapV2RouterAddr,
        uniswapV2FactoryAddr,
        0
      );

      await expect(
        dexRegistry.addDEX(
          "UNISWAP_V2",
          sushiswapRouterAddr,
          sushiswapFactoryAddr,
          1
        )
      ).to.be.rejectedWith("Aready registered DEX");
      expect(await dexRegistry.getDEXs()).to.deep.equal(["UNISWAP_V2"]);
      expect(await dexRegistry.dexInfo("UNISWAP_V2")).to.deep.equal([
        uniswapV2RouterAddr,
        uniswapV2FactoryAddr,
        0,
      ]);
    });
  });

  describe("Removing DEX", async () => {
    it("should remove a registered", async () => {
      const { dexRegistry } = await loadFixture(deployDEXRegistryContract);
      await dexRegistry.addDEX(
        "UNISWAP_V2",
        uniswapV2RouterAddr,
        uniswapV2FactoryAddr,
        0
      );

      await dexRegistry.removeDEX("UNISWAP_V2");
      expect(await dexRegistry.getDEXs()).to.deep.equal([]);
      expect(await dexRegistry.dexInfo("UNISWAP_V2")).to.deep.equal([
        nullAddress,
        nullAddress,
        0,
      ]);
    });

    it("should not remove a non registered DEX", async () => {
      const { dexRegistry } = await loadFixture(deployDEXRegistryContract);
      await expect(dexRegistry.removeDEX("UNISWAP_V2")).to.be.rejectedWith(
        "DEX not registered"
      );
    });
  });
});
