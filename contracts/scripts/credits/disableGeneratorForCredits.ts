import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read, execute, catchUnknownSigner} = hre.deployments;
	const RewardsGenerator = await hre.deployments.get('RewardsGenerator');
	const admin = await read('ConquestCredits', 'owner');
	console.log({admin});
	await catchUnknownSigner(
		execute(
			'ConquestCredits',
			{from: admin, log: true},
			'setGenerator',
			RewardsGenerator.address,
			false,
		),
	);
}
if (require.main === module) {
	func(hre);
}
