import type {HardhatUserConfig} from 'hardhat/config';

import HardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
import HardhatViem from '@nomicfoundation/hardhat-viem';
import HardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import HardhatKeystore from '@nomicfoundation/hardhat-keystore';

import HardhatDeploy from 'hardhat-deploy';
import {
	addForkConfiguration,
	addNetworksFromEnv,
	addNetworksFromKnownList,
} from 'hardhat-deploy/helpers';

import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import './utils/metadata';
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
	plugins: [
		HardhatNodeTestRunner,
		HardhatViem,
		HardhatNetworkHelpers,
		HardhatKeystore,
		HardhatDeploy,
	],
	solidity: {
		profiles: {
			default: {
				version: '0.8.9',
				settings: {
					optimizer: {
						enabled: true,
						runs: 999999,
					},
				},
			},
			production: {
				version: '0.8.9',
				settings: {
					optimizer: {
						enabled: true,
						runs: 999999,
					},
				},
			},
			uniswap: {
				version: '0.5.16', // for uniswap
				settings: {
					optimizer: {
						enabled: false,
						runs: 999999,
					},
				},
			},
			dai: {
				version: '0.5.12', // For Dai.sol
				settings: {
					optimizer: {
						enabled: false,
						runs: 2000,
					},
				},
			},
		},
	},
	networks: addForkConfiguration(
		// this add a network config for all known chain using kebab-cases names
		// Note that MNEMONIC_<network> (or MNEMONIC if the other is not set) will
		// be used for account
		// Similarly ETH_NODE_URI_<network> will be used for rpcUrl
		// Note that if you set these env variable to have the value: "SECRET" it will be like using:
		//  configVariable('SECRET_ETH_NODE_URI_<network>')
		//  configVariable('SECRET_MNEMONIC_<network>')
		addNetworksFromKnownList(
			// this add network for each respective env var found (ETH_NODE_URI_<network>)
			// it will also read MNEMONIC_<network> to populate the accounts
			// And like above it will use configVariable if set to SECRET
			addNetworksFromEnv(
				// and you can add in your specific network here
				{
					default: {
						type: 'edr-simulated',
						chainType: 'l1',
						accounts: {
							mnemonic: process.env.MNEMONIC || undefined,
						},
					},
					localhost: {
						url: 'http://127.0.0.1:8545',
					},
				},
			),
		),
	),
  }),
 paths: {
  sources: ['src'],
  deploy: ['deploy_l1'],
 },
 generateTypedArtifacts: {
  destinations: [
  	{
  		folder: './generated',
  		mode: 'typescript',
  	},
  ],
 },
 gasReporter: {
  currency: 'USD',
  gasPrice: 100,
  enabled: process.env.REPORT_GAS ? true : false,
  coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  maxMethodDiff: 10,
 },
};

export default config;
