import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect, assert } from "chai";
import {
  pancakeswapFactoryAddr,
  pancakeswapRouterAddr,
  sushiswapFactoryAddr,
  sushiswapRouterAddr,
  uniswapV2FactoryAddr,
  uniswapV2RouterAddr,
  USDC_ADDR,
  WETH_ADDR,
} from "../utils/addresses";
import { ERC_20_ABI } from "../utils/erc20-abi";

const nullAddress = "0x0000000000000000000000000000000000000000";

describe("FlashSwapUniswapV2 contract", () => {
  async function deployStoreValueContract() {
    const [owner, anotherAccount] = await hre.ethers.getSigners();

    const FlashSwapUniswapV2 = await hre.ethers.getContractFactory(
      "FlashSwapUniswapV2"
    );
    const flashSwap = await FlashSwapUniswapV2.deploy(owner);
    await flashSwap.addExchangeRouter(
      "UNISWAP_V2",
      uniswapV2RouterAddr,
      uniswapV2FactoryAddr
    );
    await flashSwap.addExchangeRouter(
      "SUSHISWAP",
      sushiswapRouterAddr,
      sushiswapFactoryAddr
    );

    const usdcContract = new hre.ethers.Contract(
      USDC_ADDR,
      ERC_20_ABI,
      hre.ethers.provider
    );
    const wethContract = new hre.ethers.Contract(
      WETH_ADDR,
      ERC_20_ABI,
      hre.ethers.provider
    );
    const usdcRichWallet = await hre.ethers.getImpersonatedSigner(
      "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503"
    );
    const wethRichWallet = await hre.ethers.getImpersonatedSigner(
      "0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E"
    );

    return {
      owner,
      anotherAccount,
      flashSwap,
      usdcContract,
      wethContract,
      usdcRichWallet,
      wethRichWallet,
    };
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

      expect(await flashSwap.exchangesInfo("UNISWAP_V2")).to.deep.equal([
        uniswapV2RouterAddr,
        uniswapV2FactoryAddr,
      ]);
      expect(await flashSwap.exchangesInfo("SUSHISWAP")).to.deep.equal([
        sushiswapRouterAddr,
        sushiswapFactoryAddr,
      ]);
    });

    it("should the owner set exchange router", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await expect(
        flashSwap.addExchangeRouter(
          "PANCAKESWAP",
          pancakeswapRouterAddr,
          pancakeswapFactoryAddr
        )
      ).not.to.be.rejected;
      expect(await flashSwap.exchangesInfo("PANCAKESWAP")).to.deep.equal([
        pancakeswapRouterAddr,
        pancakeswapFactoryAddr,
      ]);
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
          .addExchangeRouter(
            "PANCAKESWAP",
            pancakeswapRouterAddr,
            pancakeswapFactoryAddr
          )
      ).to.be.rejected;
      expect(await flashSwap.getExchanges()).to.deep.equals([
        "UNISWAP_V2",
        "SUSHISWAP",
      ]);
    });

    it("should allow to owner to remove exchange", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await expect(flashSwap.removeExchangeRouter("SUSHISWAP")).not.to.be
        .rejected;
      expect(await flashSwap.getExchanges()).to.deep.equals(["UNISWAP_V2"]);
      expect(await flashSwap.exchangesInfo("SUSHISWAP")).to.deep.equal([
        nullAddress,
        nullAddress,
      ]);
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
      expect(await flashSwap.exchangesInfo("SUSHISWAP")).to.deep.equal([
        sushiswapRouterAddr,
        sushiswapFactoryAddr,
      ]);
    });
  });

  describe("Balance, deposit and withdrawals, ETH and Tokens", () => {
    it("sould get EHT and ERC20 token balance", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );

      expect(await flashSwap.getBalance()).to.equal(0);
      expect(
        await usdcContract.balanceOf(await flashSwap.getAddress())
      ).to.equal(0);
    });

    it("should receive ETH", async () => {
      const { flashSwap, owner } = await loadFixture(deployStoreValueContract);

      const amount = hre.ethers.parseEther("1");

      await expect(
        owner.sendTransaction({
          to: await flashSwap.getAddress(),
          value: amount,
        })
      ).to.emit(flashSwap, "ReceivedETH");

      expect(await flashSwap.getBalance()).to.equal(amount);
    });

    it("should receive ERC20 token", async () => {
      const { flashSwap, usdcRichWallet, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const usdcDecimals = await usdcContract.decimals();
      const amount = hre.ethers.parseUnits("1000", usdcDecimals);
      const flashSwapAddress = await flashSwap.getAddress();
      await usdcContract
        .connect(usdcRichWallet)
        .transfer(flashSwapAddress, amount);

      expect(await usdcContract.balanceOf(flashSwapAddress)).to.equal(amount);
    });

    it("could withdraw ETH, only owner", async () => {
      const { flashSwap, owner, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      const twoEthers = hre.ethers.parseEther("2");
      const oneEther = hre.ethers.parseEther("1");
      await owner.sendTransaction({
        to: await flashSwap.getAddress(),
        value: twoEthers,
      });

      await expect(flashSwap.connect(anotherAccount).withdraw(oneEther)).to.be
        .rejected;
      await expect(flashSwap.withdraw(oneEther)).not.to.be.rejected;
      expect(await flashSwap.getBalance()).to.equal(oneEther);
      await expect(flashSwap.withdraw(oneEther)).to.emit(
        flashSwap,
        "WithdrawETH"
      );
      expect(await flashSwap.getBalance()).to.equal(0);
    });

    it("could withdraw ERC20 token, only owner", async () => {
      const { flashSwap, usdcRichWallet, usdcContract, anotherAccount, owner } =
        await loadFixture(deployStoreValueContract);
      const usdcDecimals = await usdcContract.decimals();
      const twoThousands = hre.ethers.parseUnits("2000", usdcDecimals);
      const oneThousand = hre.ethers.parseUnits("1000", usdcDecimals);
      const flashSwapAddress = await flashSwap.getAddress();
      await usdcContract
        .connect(usdcRichWallet)
        .transfer(flashSwapAddress, twoThousands);

      await expect(
        flashSwap.connect(anotherAccount).withdrawTokens(USDC_ADDR, oneThousand)
      ).to.be.rejected;
      await expect(
        flashSwap.connect(owner).withdrawTokens(USDC_ADDR, oneThousand)
      ).not.to.be.rejected;
      expect(await usdcContract.balanceOf(flashSwapAddress)).to.equal(
        oneThousand
      );
      expect(await flashSwap.getTokenBalance(USDC_ADDR)).to.equal(oneThousand);
      await expect(
        flashSwap.connect(owner).withdrawTokens(USDC_ADDR, oneThousand)
      ).to.emit(flashSwap, "WithdrawnTokens");
      expect(await flashSwap.getTokenBalance(USDC_ADDR)).to.equal(0);
    });
  });
});
