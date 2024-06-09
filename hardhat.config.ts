import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: "https://mainnet.infura.io/v3/a6973d76f4894626a80a9841c7b3e2c2",
        blockNumber: 20049814,
      },
    },
  },
};

export default config;
