import "dotenv/config";

export enum NetworksNames {
  ETHEREUM = "ETHEREUM",
  POLYGON = "POLYGON",
  OPTIMISM = "OPTIMISM",
  ARBITRUM = "ARBITRUM",
}

const Blocks = {
  [NetworksNames.ETHEREUM]: 20066461,
  // [NetworksNames.ETHEREUM]: 20068293,
  [NetworksNames.POLYGON]: 58028147,
  [NetworksNames.OPTIMISM]: 121253377,
  [NetworksNames.ARBITRUM]: 220714843,
};

export const getNetworkData = (networkName: NetworksNames) => {
  const envNetworkName = process.env[`${networkName}_RPC_MAINNET_NODE_URL`];
  const envBlockNumber = Blocks[networkName];

  if (!envNetworkName || !envBlockNumber)
    throw new Error("Invalid Network data from .env");

  if (isNaN(envBlockNumber)) throw new Error("Invalid Block Number");

  return {
    networkURL: envNetworkName,
    blockNumber: envBlockNumber,
  };
};
