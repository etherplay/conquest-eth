import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {parseEther} from '@ethersproject/units';
import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs';

type Destination = {
	network: 'mainnet' | 'matic' | 'arbitrum' | 'xdai';
	address: string;
	preference?: 'usdc' | 'xdai';
	confirm?: boolean;
	exchange?: string;
	txs?: {[asset: string]: string};
};

type Winner = {
	address: string;
	numWCHI: number;
	numDollars: number;
	numTokens: number;
	discordName: string;
	messaged?: boolean;
	destination?: Destination;
	future_destination?: Destination;
};

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {claimKeyDistributor} = await hre.getNamedAccounts();
	const {execute} = hre.deployments;

	const winners: Winner[] = JSON.parse(
		await hre.deployments.readDotFile('.alpha_2_winners.json'),
	);

	// check addresses
	// const winnersWithDifferentAddresses = winners.filter(
	//   (v) =>
	//     v.destination &&
	//     v.destination.address.toLowerCase() !== v.address.toLowerCase()
	// );
	// console.log(winnersWithDifferentAddresses);

	const perNetworks: {
		[network: string]: {
			[asset: string]: {addresses: {[address: string]: number}; total: number};
		};
	} = {};
	for (const asset of ['WCHI', 'Dollars']) {
		for (const winner of winners) {
			if (winner.destination) {
				let amount = (winner as any)['num' + asset];
				if (winner.destination.txs && winner.destination.txs[asset]) {
					amount = 0;
				}
				if (amount) {
					const network = (perNetworks[winner.destination.network] =
						perNetworks[winner.destination.network] || {});
					const assetTransfers = (network[asset] = network[asset] || {
						addresses: {},
						total: 0,
					});

					assetTransfers.total += amount;
					assetTransfers.addresses[winner.destination.address] =
						(assetTransfers.addresses[winner.destination.address] || 0) +
						amount;
				}
			}
		}
	}

	const str = JSON.stringify(perNetworks, null, '  ');
	// console.log(str);
	await hre.deployments.saveDotFile('.rewards_distribution.json', str);
}

if (require.main === module) {
	func(hre);
}
