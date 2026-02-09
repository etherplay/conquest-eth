import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {ethers} from 'hardhat';
import 'dotenv/config';
import {formatEther, parseEther} from '@ethersproject/units';
import {Wallet} from 'ethers';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {deployments} = hre;
	const {claimKeyDistributor} = await hre.getNamedAccounts();
	const {execute, read} = hre.deployments;

	const claims: {
		key: string;
		amount: number;
		address: string;
		url: string;
	}[] = JSON.parse(await deployments.readDotFile('.claimKeys.beta.json'));

	let counter = 0;
	const txs: Promise<void>[] = [];
	for (const claim of claims) {
		const balance = await read('ConquestToken', 'balanceOf', claim.address);
		if (balance.eq('100000000000000000000')) {
			console.log(claim.address);
			// const wallet = new Wallet(claim.key);
			// const ConquestToken = (await ethers.getContract('ConquestToken')).connect(new Wallet(claim.key, ethers.provider));
			// const tx = await ConquestToken.transferAlongWithETH(claimKeyDistributor, '100000000000000000000', {
			//   maxPriorityFeePerGas: '5000000000',
			//   maxFeePerGas: '7000000000',
			// });
			// console.log(`${tx.hash}...`);
			// txs.push(tx.wait().then(() => console.log(`${tx.hash} complete`)));
			// await execute(
			//   'ConquestToken',
			//   {from: claim.key, log: true},
			//   'transferAlongWithETH',
			//   claimKeyDistributor,
			//   '100000000000000000000'
			// );
			counter++;
		} else {
		}
	}
	console.log({counter});
	await Promise.all(txs);
}

async function main() {
	await func(hre);
}

if (require.main === module) {
	main();
}
