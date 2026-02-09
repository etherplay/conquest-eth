// ----------------------------------------------------------------------------
// Typed Config
// ----------------------------------------------------------------------------
import type {
	EnhancedEnvironment,
	UnknownDeployments,
	UserConfig,
} from 'rocketh/types';

// this one provide a protocol supporting private key as account
import {privateKey} from '@rocketh/signer';

const deployments: string[] = [
	// 'deploy/00_block_upgrades',
	'deploy/01_play_tokens',
	'deploy/02_alliance_registry',
	'deploy/03_outerspace',
];
const deployments_dev: string[] = [
	// 'deploy/00_block_upgrades',
	'deploy/04_setup',
	'deploy/20_basic_alliances',
	'deploy/30_plugins',
];

const deploymentsFolder = deployments.concat(deployments_dev);
// console.log({hardhatNetworkDeploymentFolders});

// we define our config and export it as "config"
export const config = {
	accounts: {
		deployer: {
			default: 0,
		},
		tokenBeneficiary: {
			default: 0,
		},
		playerAccount3: '0x283aFaad5c345680144f20F3910EA95e5F0bA932',
		playerAccount4: '0x7fCe02BB66c0D9396fb9bC60a80d45462E60fdfF',
		agentService: {
			default: 1,
			hardhat: 1,
			localhost: '0x3bfa2f0888E7d87f9bb044EAE82CEb62290337B4', // see ../agent-service/.env(.default)
			1337: '0x3bfa2f0888E7d87f9bb044EAE82CEb62290337B4', // see ../agent-service/.env(.default)
			defcon: '0x52F0a4CdE745D46212Fb1CBBc44721238036030a',
		},
		claimKeyDistributor: {
			default: 0,
			hardhat: 0,
			1337: 0,
			31337: 0,
			4: 2,
			5: 2,
			100: 2,
		},
	},
	chains: {
		31337: {
			tags: ['auto-mine', 'external-token'],
			// tags: ['auto-mine'],
		},
	},
	scripts: deploymentsFolder,
	data: {},
	signerProtocols: {
		privateKey,
	},
} as const satisfies UserConfig;

// then we import each extensions we are interested in using in our deploy script or elsewhere

// this one provide a deploy function
import * as deployExtension from '@rocketh/deploy';
// this one provide read,execute functions
import * as readExecuteExtension from '@rocketh/read-execute';
// this one provide a deployViaProxy function that let you declaratively
//  deploy proxy based contracts
import * as deployProxyExtension from '@rocketh/proxy';
// this one provide a viem handle to clients and contracts
import * as viemExtension from '@rocketh/viem';
// this one provide a function to deploy diamond contracts
import * as diamondExtension from '@rocketh/diamond';

// and export them as a unified object
const extensions = {
	...deployExtension,
	...readExecuteExtension,
	...deployProxyExtension,
	...viemExtension,
	...diamondExtension,
};
export {extensions};

// then we also export the types that our config ehibit so other can use it

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;
type Environment = EnhancedEnvironment<
	Accounts,
	Data,
	UnknownDeployments,
	Extensions
>;

export type {Extensions, Accounts, Data, Environment};
