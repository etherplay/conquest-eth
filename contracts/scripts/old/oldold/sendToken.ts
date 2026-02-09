import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {parseEther} from '@ethersproject/units';
import {BigNumber} from '@ethersproject/bignumber';

const args = process.argv.slice(2);

if (args.length === 0) {
	throw new Error(`need to pass the addresses to send to`);
}
const addresses = args[0].split(',');
const amount = args[1];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {claimKeyDistributor} = await hre.getNamedAccounts();
	const {execute} = hre.deployments;
	const amountPerAddress = BigNumber.from(amount).div(addresses.length);
	if (!amountPerAddress.mul(addresses.length).eq(amount)) {
		throw new Error(`amount not divisble per number of addresses`);
	}
	await execute(
		'ConquestToken',
		{from: claimKeyDistributor, value: '0', log: true, autoMine: true},
		'distributeAlongWithETH',
		addresses,
		parseEther(amount),
	);
}
if (require.main === module) {
	func(hre);
}
