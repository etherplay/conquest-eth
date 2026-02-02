import {formatEther} from '@ethersproject/units';
import {BigNumber} from 'ethers';
import hre, {ethers} from 'hardhat';

async function func(): Promise<void> {
	const {deployments, getNamedAccounts} = hre;
	const {read, execute} = deployments;

	const {deployer} = await getNamedAccounts();

	const highscore_rewards_str = await deployments.readDotFile(
		'.highscore_rewards.json',
	);
	const highscore_rewards: {address: string; reward: string}[] = JSON.parse(
		highscore_rewards_str,
	);

	const addresses: string[] = [];
	const tokenAmounts: BigNumber[] = [];
	const nativeTokemAmounts: BigNumber[] = [];
	let totalValue = BigNumber.from(0);

	for (const reward of highscore_rewards) {
		addresses.push(reward.address);
		tokenAmounts.push(BigNumber.from(0));
		nativeTokemAmounts.push(BigNumber.from(reward.reward));
		totalValue = totalValue.add(BigNumber.from(reward.reward));
	}

	console.log({
		totalValue: formatEther(totalValue),
	});

	const balance = await ethers.provider.getBalance(addresses[0]);
	console.log({
		balance: formatEther(balance),
	});

	await execute(
		'PlayToken',
		{
			from: deployer,
			log: true,
			autoMine: true,
			value: totalValue,
		},
		'distributeVariousAmountsOfTokenAndETH',
		addresses,
		tokenAmounts,
		nativeTokemAmounts,
	);

	const balanceAfter = await ethers.provider.getBalance(addresses[0]);
	console.log({
		balanceAfter: formatEther(balanceAfter),
	});
}
if (require.main === module) {
	func();
}
