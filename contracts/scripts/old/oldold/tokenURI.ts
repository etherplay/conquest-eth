import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

const args = process.argv.slice(2);

if (args.length === 0) {
	throw new Error(`need to pass the addresses to send to`);
}
const location = args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read} = hre.deployments;
	console.log(await read('OuterSpace', 'tokenURI', location));
}
if (require.main === module) {
	func(hre);
}
