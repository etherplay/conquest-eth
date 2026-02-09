import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {BigNumber} from 'ethers';
import {formatEther} from '@ethersproject/units';

const args = process.argv.slice(2);

if (args.length !== 1) {
	throw new Error(`<name>`);
}
const deploymentName = args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read} = hre.deployments;
	const value = await read(deploymentName, 'totalSupply');
	console.log(formatEther(value));
}
if (require.main === module) {
	func(hre);
}
