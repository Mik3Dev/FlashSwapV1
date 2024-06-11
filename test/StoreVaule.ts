// import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
// import hre from "hardhat";
// import { expect } from "chai";
// import { USDC_ADDR } from "../utils/addresses";
// import { ERC_20_ABI } from "../utils/erc20-abi";

// describe("StoreValue contract", () => {
//   async function deployStoreValueContract() {
//     const [owner, anotherAccount] = await hre.ethers.getSigners();

//     const StoreValue = await hre.ethers.getContractFactory("StoreValue");
//     const storeValue = await StoreValue.deploy(owner);

//     const oneEther = hre.ethers.parseEther("1");
//     const twoEthers = hre.ethers.parseEther("2");
//     const usdcContract = new hre.ethers.Contract(
//       USDC_ADDR,
//       ERC_20_ABI,
//       hre.ethers.provider
//     );
//     const usdcTokenHolder = await hre.ethers.getImpersonatedSigner(
//       "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503"
//     );
//     const usdcAmount = hre.ethers.parseUnits("1000", 6);
//     await usdcContract
//       .connect(usdcTokenHolder)
//       .transfer(await storeValue.getAddress(), usdcAmount);

//     await usdcContract
//       .connect(usdcTokenHolder)
//       .transfer(anotherAccount, usdcAmount);

//     await usdcContract.connect(usdcTokenHolder).transfer(owner, usdcAmount);

//     return {
//       owner,
//       anotherAccount,
//       storeValue,
//       oneEther,
//       twoEthers,
//       usdcContract,
//       usdcAmount,
//     };
//   }

//   describe("Deployment", () => {
//     it("should deploy contract with correct owner", async () => {
//       const { owner, anotherAccount, storeValue } = await loadFixture(
//         deployStoreValueContract
//       );
//       expect(await storeValue.owner()).to.equal(owner.address);
//       expect(await storeValue.owner()).not.to.equal(anotherAccount.address);
//     });
//   });

//   describe("Balance ETH", () => {
//     it("should return zero after deployment", async () => {
//       const { storeValue } = await loadFixture(deployStoreValueContract);
//       expect(await storeValue.getBalance()).to.equal(0);
//     });

//     it("should return the correct balance", async () => {
//       const { storeValue, owner, anotherAccount, oneEther, twoEthers } =
//         await loadFixture(deployStoreValueContract);

//       await owner.sendTransaction({
//         to: await storeValue.getAddress(),
//         value: oneEther,
//       });
//       expect(await storeValue.getBalance()).to.equal(oneEther.toString());

//       await anotherAccount.sendTransaction({
//         to: await storeValue.getAddress(),
//         value: oneEther,
//       });
//       expect(await storeValue.getBalance()).to.equal(twoEthers.toString());
//     });

//     it("should show balance only to owner", async () => {
//       const { storeValue, anotherAccount } = await loadFixture(
//         deployStoreValueContract
//       );
//       await expect(storeValue.getBalance()).to.not.be.rejected;
//       await expect(storeValue.connect(anotherAccount).getBalance()).to.be
//         .rejected;
//     });
//   });

//   describe("Receiving ETH", () => {
//     it("should receive ethers", async () => {
//       const { storeValue, owner, anotherAccount, oneEther, twoEthers } =
//         await loadFixture(deployStoreValueContract);
//       await expect(
//         owner.sendTransaction({
//           to: await storeValue.getAddress(),
//           value: oneEther,
//         })
//       ).to.emit(storeValue, "ReceivedETH");
//       expect(await storeValue.getBalance()).to.equal(oneEther.toString());
//       await expect(
//         anotherAccount.sendTransaction({
//           to: await storeValue.getAddress(),
//           value: oneEther,
//         })
//       ).to.emit(storeValue, "ReceivedETH");
//       expect(await storeValue.getBalance()).to.equal(twoEthers);
//     });
//   });

//   describe("Withdraw ETH", () => {
//     it("should allow to withdraw ethers to owner", async () => {
//       const { storeValue, owner, oneEther } = await loadFixture(
//         deployStoreValueContract
//       );
//       await owner.sendTransaction({
//         to: await storeValue.getAddress(),
//         value: oneEther,
//       });
//       expect(await storeValue.getBalance()).to.equal(oneEther.toString());
//       await expect(storeValue.withdraw(oneEther.toString())).to.not.be.reverted;
//       expect(await storeValue.getBalance()).to.equal(0);
//     });

//     it("should emit events after receive and withdraw ETHs", async () => {
//       const { storeValue, owner, oneEther } = await loadFixture(
//         deployStoreValueContract
//       );
//       const value = oneEther;
//       await expect(
//         owner.sendTransaction({
//           to: await storeValue.getAddress(),
//           value: value.toString(),
//         })
//       ).to.emit(storeValue, "ReceivedETH");
//       await expect(storeValue.withdraw(value)).to.emit(
//         storeValue,
//         "WithdrawnETH"
//       );
//     });

//     it("should not allow withdraw ethers another accounts", async () => {
//       const { storeValue, anotherAccount, oneEther } = await loadFixture(
//         deployStoreValueContract
//       );
//       await anotherAccount.sendTransaction({
//         to: await storeValue.getAddress(),
//         value: oneEther,
//       });
//       expect(await storeValue.getBalance()).to.equal(oneEther.toString());
//       await expect(storeValue.connect(anotherAccount).withdraw(oneEther)).to.be
//         .reverted;
//       expect(await storeValue.getBalance()).to.equal(oneEther.toString());
//     });
//   });

//   describe("Token Balance", () => {
//     it("should return correct balance", async () => {
//       const { storeValue, usdcContract, usdcAmount } = await loadFixture(
//         deployStoreValueContract
//       );

//       const erc20Address = await usdcContract.getAddress();
//       expect(await storeValue.getTokenBalance(erc20Address)).to.equal(
//         usdcAmount
//       );
//     });

//     it("should not allow to get balance to not owner account", async () => {
//       const { anotherAccount, storeValue, usdcContract } = await loadFixture(
//         deployStoreValueContract
//       );
//       const erc20Address = await usdcContract.getAddress();
//       await expect(
//         storeValue.connect(anotherAccount).getTokenBalance(erc20Address)
//       ).to.be.reverted;
//     });
//   });

//   describe("Receiving Token", () => {
//     it("should receive tokens by owner", async () => {
//       const { owner, storeValue, usdcContract } = await loadFixture(
//         deployStoreValueContract
//       );
//       const storeAddress = await storeValue.getAddress();
//       await expect(
//         usdcContract.connect(owner).transfer(storeAddress, 50)
//       ).changeTokenBalances(usdcContract, [owner, storeAddress], [-50, 50]);
//     });

//     it("should receive tokens by another account", async () => {
//       const { anotherAccount, storeValue, usdcContract } = await loadFixture(
//         deployStoreValueContract
//       );

//       const storeAddress = await storeValue.getAddress();
//       await expect(
//         usdcContract.connect(anotherAccount).transfer(storeAddress, 50)
//       ).changeTokenBalances(
//         usdcContract,
//         [anotherAccount, storeAddress],
//         [-50, 50]
//       );
//     });
//   });

//   describe("Withdrawal Token", () => {
//     it("should allow withdraw to owner", async () => {
//       const { owner, storeValue, usdcContract, usdcAmount } = await loadFixture(
//         deployStoreValueContract
//       );

//       const withdrawalAmount = hre.ethers.parseUnits("500", 6);

//       const storeAddress = await storeValue.getAddress();
//       const contractAddr = await usdcContract.getAddress();
//       expect(await storeValue.getTokenBalance(contractAddr)).to.equal(
//         usdcAmount
//       );
//       await expect(
//         storeValue.withdrawTokens(contractAddr, withdrawalAmount)
//       ).to.emit(storeValue, "WithdrawnTokens");

//       expect(await storeValue.getTokenBalance(contractAddr)).to.equal(
//         withdrawalAmount
//       );
//       await expect(
//         storeValue.withdrawTokens(contractAddr, withdrawalAmount)
//       ).to.changeTokenBalances(
//         usdcContract,
//         [storeAddress, owner],
//         [`-${withdrawalAmount.toString()}`, withdrawalAmount.toString()]
//       );
//       expect(await storeValue.getTokenBalance(contractAddr)).to.equal(0);
//     });

//     it("should not allow to withdraw token to another account", async () => {
//       const { anotherAccount, storeValue, usdcContract, usdcAmount } =
//         await loadFixture(deployStoreValueContract);
//       const erc20Address = await usdcContract.getAddress();
//       await expect(
//         storeValue.connect(anotherAccount).withdrawTokens(erc20Address, 500)
//       ).to.be.reverted;
//       expect(await storeValue.getTokenBalance(erc20Address)).to.equal(
//         usdcAmount.toString()
//       );
//     });
//   });
// });
