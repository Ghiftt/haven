require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    kite_testnet: {
      url: process.env.KITE_RPC_URL,
      chainId: 2368,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  solidity: "0.8.28",
};
