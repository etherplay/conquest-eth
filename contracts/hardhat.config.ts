import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'hardhat-contract-sizer';
import 'hardhat-deploy-tenderly';
import './utils/metadata';
import {node_url, accounts, addForkConfiguration} from './utils/network';
const l1_deployments: string[] = [];
const l1_deployments_dev: string[] = [];
const l2_deployments: string[] = [
  // 'deploy_l2/00_block_upgrades',
  'deploy_l2/01_play_tokens',
  'deploy_l2/02_alliance_registry',
  'deploy_l2/03_outerspace',
];
const l2_deployments_dev: string[] = [
  // 'deploy_l2/00_block_upgrades',
  'deploy_l2/04_setup',
  'deploy_l2/10_agent_service',
  'deploy_l2/20_basic_alliances',
  'deploy_l2/30_plugins',
];

const hardhatNetworkDeploymentFolders = l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev);
// console.log({hardhatNetworkDeploymentFolders});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      {
        version: '0.5.16', // for uniswap
        settings: {
          optimizer: {
            enabled: false,
            runs: 999999,
          },
        },
      },
      {
        version: '0.5.12', // For Dai.sol
        settings: {
          optimizer: {
            enabled: false,
            runs: 2000,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    playerAccount3: '0x283aFaad5c345680144f20F3910EA95e5F0bA932',
    playerAccount4: '0x7fCe02BB66c0D9396fb9bC60a80d45462E60fdfF',
    agentService: {
      hardhat: 1,
      localhost: '0x3bfa2f0888E7d87f9bb044EAE82CEb62290337B4', // see ../agent-service/.env(.default)
      1337: '0x3bfa2f0888E7d87f9bb044EAE82CEb62290337B4', // see ../agent-service/.env(.default)
      defcon: '0x52F0a4CdE745D46212Fb1CBBc44721238036030a',
    },
    claimKeyDistributor: {
      hardhat: 0,
      1337: 0,
      31337: 0,
      4: 2,
      5: 2,
      100: 2,
    },
  },
  networks: addForkConfiguration({
    hardhat: {
      initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
      deploy: hardhatNetworkDeploymentFolders,
      mining: process.env.MINING_INTERVAL
        ? {
            auto: false,
            interval: process.env.MINING_INTERVAL.split(',').map((v) => parseInt(v)) as [number, number],
          }
        : undefined,
    },
    localhost: {
      url: node_url('localhost'),
      accounts: accounts(),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    beta: {
      url: node_url('gnosis_chain'),
      accounts: accounts('gnosis_chain'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    defcon: {
      url: node_url('gnosis_chain'),
      accounts: accounts('gnosis_chain'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    zetachain_testnet: {
      url: node_url('zetachain_testnet'),
      accounts: accounts('zetachain_testnet'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    sepolia: {
      url: node_url('sepolia'),
      accounts: accounts('sepolia'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    sepolia_fast: {
      url: node_url('sepolia'),
      accounts: accounts('sepolia'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    '2025_1_test': {
      url: node_url('gnosis_chain'),
      accounts: accounts('gnosis_chain'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    '2025_1': {
      url: node_url('gnosis_chain'),
      accounts: accounts('gnosis_chain'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
    endurance_test: {
      url: node_url('endurance_chain'),
      accounts: accounts('endurance_chain'),
      deploy: l1_deployments.concat(l1_deployments_dev, l2_deployments, l2_deployments_dev),
    },
  }),
  paths: {
    sources: 'src',
    deploy: ['deploy_l1'],
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 100,
    enabled: process.env.REPORT_GAS ? true : false,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    maxMethodDiff: 10,
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  mocha: {
    timeout: 0,
  },
  external: {
    deployments: process.env.HARDHAT_FORK
      ? {
          // process.env.HARDHAT_FORK will specify the network that the fork is made from.
          // these lines allow it to fetch the deployments from the network being forked from both for node and deploy task
          hardhat: ['deployments/' + process.env.HARDHAT_FORK],
          localhost: ['deployments/' + process.env.HARDHAT_FORK],
        }
      : undefined,
    contracts: [
      {
        artifacts: 'node_modules/ethereum-transfer-gateway/export/artifacts',
        deploy: 'node_modules/ethereum-transfer-gateway/export/deploy',
      },
    ],
  },

  tenderly: {
    project: 'conquest-eth', // TODO parameterize with network name
    username: process.env.TENDERLY_USERNAME as string,
    appendNetworkNameToProject: true,
  },
};

if (process.env.PLAYER && config.namedAccounts) {
  config.namedAccounts.player = process.env.PLAYER;
}

export default config;
