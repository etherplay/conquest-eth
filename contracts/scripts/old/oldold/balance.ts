import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {formatEther} from '@ethersproject/units';

const args = process.argv.slice(2);

const deploymentName = args[1] ? args[0] : undefined;
const address = args[1] ? args[1] : args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read} = hre.deployments;
	if (deploymentName) {
		const value = await read(deploymentName, 'balanceOf', address);
		console.log(formatEther(value));
	} else {
		const value = await hre.ethers.provider.getBalance(address);
		console.log(formatEther(value));
	}
}
if (require.main === module) {
	func(hre);
}
