require("@nomicfoundation/hardhat-toolbox")
require("@nomiclabs/hardhat-waffle")
require('dotenv').config()
require('hardhat-abi-exporter')

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: [10000, 50000]
      }
    },
    bscTestnet:{
      url: process.env.RPC_BSC_TESTNET || "https://data-seed-prebsc-1-s3.binance.org:8545",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    goerliTestnet:{
      url: process.env.RPC_GOERLI_TESTNET || "https://goerli.infura.io/v3/7bb82959cfb64e29837402af4ecb6d8d",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    esgsmartTestnet:{
      url: process.env.RPC_ESGSMART_TESTNET || "https://node1-test.esgsmartchain.com/",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  solidity: {
    compilers: [{
      version: "0.6.6",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }]
  },
  abiExporter: {
    path: './abi',
    pretty: true,
  }
};