import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

const args = process.argv.slice(2);

const txHash = args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const tx = await hre.ethers.provider.getTransaction(txHash);

	console.log(
		`-------------------------------- TRANSACTION ---------------------------------------`,
	);
	console.log(tx);
	console.log(
		`-------------------------------- ----------- ---------------------------------------`,
	);

	const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);

	console.log(
		`-------------------------------- RECEIPT ---------------------------------------`,
	);
	console.log(receipt);
	console.log(
		`-------------------------------- ------- ---------------------------------------`,
	);
}

if (require.main === module) {
	func(hre);
}
