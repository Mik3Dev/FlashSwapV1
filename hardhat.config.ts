import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { getNetworkData, NetworksNames } from "./utils/networks";

const { networkURL, blockNumber } = getNetworkData(NetworksNames.ETHEREUM);

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: networkURL,
        blockNumber,
      },
    },
  },
};

export default config;
