import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect, assert } from "chai";
import {
  BAT_ADDR,
  CRV_ADDR,
  pancakeswapFactoryAddr,
  pancakeswapRouterAddr,
  sushiswapFactoryAddr,
  sushiswapRouterAddr,
  uniswapV2FactoryAddr,
  uniswapV2RouterAddr,
  uniswapV3QuoterAddr,
  uniswapV3SwapRouterAddr,
  USDC_ADDR,
  WETH_ADDR,
} from "../utils/addresses";
import { ERC_20_ABI } from "../utils/erc20-abi";
import { SUSHI_ADDR } from "../utils/addresses";

const nullAddress = "0x0000000000000000000000000000000000000000";

describe("FlashSwapV1 contract", () => {
  async function deployStoreValueContract() {
    const [owner, anotherAccount] = await hre.ethers.getSigners();

    const FlashSwapV1 = await hre.ethers.getContractFactory("FlashSwapV1");
    const flashSwap = await FlashSwapV1.deploy(owner);
    await flashSwap.addExchangeRouter(
      "UNISWAP_V2",
      uniswapV2RouterAddr,
      uniswapV2FactoryAddr,
      0
    );
    await flashSwap.addExchangeRouter(
      "SUSHISWAP",
      sushiswapRouterAddr,
      sushiswapFactoryAddr,
      0
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
        0,
      ]);
      expect(await flashSwap.exchangesInfo("SUSHISWAP")).to.deep.equal([
        sushiswapRouterAddr,
        sushiswapFactoryAddr,
        0,
      ]);
    });

    it("should set exchange router by owner account", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await expect(
        flashSwap.addExchangeRouter(
          "PANCAKESWAP",
          pancakeswapRouterAddr,
          pancakeswapFactoryAddr,
          0
        )
      ).not.to.be.rejected;
      expect(await flashSwap.exchangesInfo("PANCAKESWAP")).to.deep.equal([
        pancakeswapRouterAddr,
        pancakeswapFactoryAddr,
        0,
      ]);
      expect(await flashSwap.getExchanges()).to.deep.equal([
        "UNISWAP_V2",
        "SUSHISWAP",
        "PANCAKESWAP",
      ]);
    });

    it("should not allow to non owner set exchange router", async () => {
      const { flashSwap, anotherAccount } = await loadFixture(
        deployStoreValueContract
      );
      await expect(
        flashSwap
          .connect(anotherAccount)
          .addExchangeRouter(
            "PANCAKESWAP",
            pancakeswapRouterAddr,
            pancakeswapFactoryAddr,
            0
          )
      ).to.be.rejected;
      expect(await flashSwap.getExchanges()).to.deep.equals([
        "UNISWAP_V2",
        "SUSHISWAP",
      ]);
    });

    it("should add a uniswapV3 type exchange", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await expect(
        flashSwap.addExchangeRouter(
          "UNISWAP_V3",
          uniswapV3SwapRouterAddr,
          uniswapV3QuoterAddr,
          1
        )
      ).not.to.be.rejected;
      expect(await flashSwap.getExchanges()).to.deep.equal([
        "UNISWAP_V2",
        "SUSHISWAP",
        "UNISWAP_V3",
      ]);
      expect(await flashSwap.exchangesInfo("UNISWAP_V3")).to.deep.equal([
        uniswapV3SwapRouterAddr,
        uniswapV3QuoterAddr,
        1,
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
        0,
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
        0,
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

  describe("Flash Swap", () => {
    // it("should start arbitrage USDC => WETH => USDC", async () => {
    //   const { flashSwap, owner } = await loadFixture(deployStoreValueContract);
    //   await flashSwap.addExchangeRouter(
    //     "PANCAKESWAP",
    //     pancakeswapRouterAddr,
    //     pancakeswapFactoryAddr
    //   );

    //   const exchangeNames = ["UNISWAP_V2", "SUSHISWAP"];
    //   const tokens = [ONEINCH_ADDR, WETH_ADDR];
    //   const amountNumber = 10;
    //   const amountToBorrow = hre.ethers.parseUnits(amountNumber.toString(), 18);

    //   assert(
    //     await flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
    //   );
    // });

    it("should reject a transaction if pair does not exists", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2", "SUSHISWAP"];
      const tokens = [USDC_ADDR, BAT_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Pool does not exist");
    });

    it("should reject a transaction if exchange is no registered", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2", "PANCAKESWAP"];
      const tokens = [USDC_ADDR, BAT_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Exchange not registered");
    });

    it("should reject a transaction if exchange list is less than 2", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2"];
      const tokens = [USDC_ADDR, BAT_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Invalid exchange names length");
    });

    it("should reject a transaction if token list is less than 2", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2", "SUSHISWAP"];
      const tokens = [USDC_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Invalid tokens address length");
    });

    it("should reject a transaction if token list and tokens address lenght mismatch", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2", "SUSHISWAP", "PANCAKESWAP"];
      const tokens = [USDC_ADDR, WETH_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Invalid lengths");
    });

    it("should reject a transaction if amount to borrow is zero", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2", "SUSHISWAP"];
      const tokens = [USDC_ADDR, WETH_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 0;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Invalid borrowed amount");
    });

    it("should be rejected if trade is not profitable", async () => {
      const { flashSwap, usdcContract } = await loadFixture(
        deployStoreValueContract
      );
      const exchangeNames = ["UNISWAP_V2", "SUSHISWAP"];
      const tokens = [USDC_ADDR, WETH_ADDR];
      const usdcDecimals = await usdcContract.decimals();
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(
        amountNumber.toString(),
        usdcDecimals
      );

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Arbitrage not profitable");
    });

    it("should not call receiveFlashLoan", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      const tokens = [USDC_ADDR];
      const amounts = [100];
      const feeAmounts = [0];
      const userData = "0x";

      await expect(
        flashSwap.receiveFlashLoan(tokens, amounts, feeAmounts, userData)
      ).to.be.rejectedWith("Invalid vault address");
    });

    it("should make a arbitrage from uniswapV2 to uniswapV3", async () => {
      const { flashSwap } = await loadFixture(deployStoreValueContract);
      await flashSwap.addExchangeRouter(
        "UNISWAP_V3",
        uniswapV3SwapRouterAddr,
        uniswapV3QuoterAddr,
        1
      );

      const exchangeNames = ["UNISWAP_V2", "UNISWAP_V3"];
      const tokens = [USDC_ADDR, WETH_ADDR];
      const amountNumber = 10_000;
      const amountToBorrow = hre.ethers.parseUnits(amountNumber.toString(), 6);

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Arbitrage not profitable");
    });

    it("should make a arbitrage from uniswapV3 to uniswapV2", async () => {
      const { flashSwap, owner } = await loadFixture(deployStoreValueContract);
      await flashSwap.addExchangeRouter(
        "UNISWAP_V3",
        uniswapV3SwapRouterAddr,
        uniswapV3QuoterAddr,
        1
      );

      await owner.sendTransaction({
        to: await flashSwap.getAddress(),
        value: hre.ethers.parseEther("1"),
      });

      console.log("Balance", await flashSwap.getBalance());
      const exchangeNames = ["UNISWAP_V3", "UNISWAP_V2"];
      const tokens = [WETH_ADDR, SUSHI_ADDR];
      const amountNumber = 1;
      const amountToBorrow = hre.ethers.parseUnits(amountNumber.toString(), 18);

      await expect(
        flashSwap.executeflashSwap(exchangeNames, tokens, amountToBorrow)
      ).to.be.rejectedWith("Arbitrage not profitable");
    });
  });
});
