import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {formatEther} from '@ethersproject/units';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {read, execute, catchUnknownSigner} = hre.deployments;
	const {deployer} = await hre.getNamedAccounts();

	const args = process.argv.slice(2);
	const owner = args[0];
	const locations = args.slice(1);

	console.log({
		owner,
		locations,
	});

	const OuterSpace = await hre.deployments.get('OuterSpace');

	console.log({
		playToken: formatEther(await read('PlayToken', 'balanceOf', owner)),
		freePlayToken: formatEther(await read('FreePlayToken', 'balanceOf', owner)),
		freePlayTokenInOuterSpace: formatEther(
			await read('FreePlayToken', 'balanceOf', OuterSpace.address),
		),
	});

	await catchUnknownSigner(
		execute(
			'OuterSpace',
			{from: deployer, log: true},
			'fetchAndWithdrawFor',
			owner,
			locations,
		),
	);

	console.log({
		playToken: formatEther(await read('PlayToken', 'balanceOf', owner)),
		freePlayToken: formatEther(await read('FreePlayToken', 'balanceOf', owner)),
		freePlayTokenInOuterSpace: formatEther(
			await read('FreePlayToken', 'balanceOf', OuterSpace.address),
		),
	});
}
if (require.main === module) {
	func(hre);
}
