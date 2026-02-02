import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {formatEther, parseEther} from '@ethersproject/units';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {deployments} = hre;

	const players: {
		id: string;
		introducer: {id: string};
		tokenGiven: string;
	}[] = JSON.parse(await deployments.readDotFile('.players.json'));
	console.log({numPlayers: players.length});

	for (const player of players) {
		const balance = await hre.ethers.provider.getBalance(player.id);
		const need = parseEther('1');
		if (balance.lt(parseEther('0.19'))) {
			const toSend = need.sub(balance);
			console.log(
				`(balance: ${formatEther(balance)}), sending ${formatEther(toSend)} ... `,
			);
			const tx = await hre.ethers.provider
				.getSigner(2)
				.sendTransaction({to: player.id, value: toSend});
			console.log(`tx: ${tx.hash} ...`);
			await tx.wait();
		} else {
			console.log(`(enough balance: ${formatEther(balance)})`);
		}
	}
}

async function main() {
	await func(hre);
}

if (require.main === module) {
	main();
}
