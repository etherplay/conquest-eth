import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read} = hre.deployments;
	const config = await read('OuterSpace', 'getConfig');
	console.log(JSON.stringify(config, null, 2));
}
if (require.main === module) {
	func(hre);
}
