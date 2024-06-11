import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

// describe("BalanceFlashLoan", function () {
//   async function deployBalancerFlashLoanContract() {
//     const [owner, otherAccount] = await hre.ethers.getSigners();

//     const BalancerFlashLoan = await hre.ethers.getContractFactory(
//       "BalancerFlashLoan"
//     );
//     const balancerFlashLoan = await BalancerFlashLoan.deploy(owner);

//     return { balancerFlashLoan, owner, otherAccount };
//   }

//   describe("contract deployment", () => {
//     it("should set an owner", async () => {
//       const { balancerFlashLoan, owner, otherAccount } = await loadFixture(
//         deployBalancerFlashLoanContract
//       );
//       expect(await balancerFlashLoan.owner()).to.equal(owner.address);
//       expect(await balancerFlashLoan.owner()).not.equal(otherAccount.address);
//     });
//   });
// });
