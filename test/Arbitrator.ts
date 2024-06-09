import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import hre from "hardhat";
import { expect } from "chai";

// describe("Arbitrator", () => {
//   async function deployArbitratorContract() {
//     const [owner, otherAccount] = await hre.ethers.getSigners();

//     const Arbitrator = await hre.ethers.getContractFactory("Arbitrator");
//     const arbitrator = await Arbitrator.deploy(owner);

//     const TestUniswapV2Router02 = await hre.ethers.getContractFactory(
//       "TestUniswapV2Router02"
//     );
//     const routerA = await TestUniswapV2Router02.deploy();
//     const routerB = await TestUniswapV2Router02.deploy();

//     const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
//     const tokenA = await TestERC20.deploy("TokenA", "TKA");
//     const tokenB = await TestERC20.deploy("TokenB", "TKB");

//     tokenA.transfer(await arbitrator.getAddress(), 10000);
//     tokenA.transfer(await routerA.getAddress(), 10000);
//     tokenA.transfer(await routerB.getAddress(), 10000);

//     tokenB.transfer(await arbitrator.getAddress(), 20000);
//     tokenB.transfer(await routerA.getAddress(), 20000);
//     tokenB.transfer(await routerB.getAddress(), 20000);

//     return {
//       arbitrator,
//       otherAccount,
//       owner,
//       routerA,
//       routerB,
//       tokenA,
//       tokenB,
//     };
//   }

//   describe("Deployment", () => {
//     it("should deploy the contract with owner", async () => {
//       const { arbitrator, owner, otherAccount } = await loadFixture(
//         deployArbitratorContract
//       );

//       expect(await arbitrator.owner()).to.equal(owner.address);
//       expect(await arbitrator.owner()).to.not.equal(otherAccount.address);
//     });
//   });

//   describe("Execute Arbitrage", async () => {
//     it("should create swap", async () => {
//       const { arbitrator, tokenA, tokenB, routerA, routerB } =
//         await loadFixture(deployArbitratorContract);

//       const routes = [await routerA.getAddress(), await routerB.getAddress()];
//       const tokens = [await tokenA.getAddress(), await tokenB.getAddress()];
//       const amounts = [5000, 5500];
//       await arbitrator.executeArbitrage(routes, tokens, amounts);

//       expect(await tokenA.balanceOf(await arbitrator.getAddress())).to.equal(
//         105000
//       );
//     });
//   });
// });
