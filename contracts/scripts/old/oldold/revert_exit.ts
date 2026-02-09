import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {xyToLocation} from 'conquest-eth-common';

const args = process.argv.slice(2);

if (args.length === 0) {
	throw new Error(`need to pass the addresses to send to`);
}
let location = args[0];

if (location.indexOf(',') !== -1) {
	const [x, y] = location.split(',').map((v) => parseInt(v));
	location = xyToLocation(x, y);
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {deployer} = await hre.getNamedAccounts();
	const {execute} = hre.deployments;

	await execute(
		'OuterSpace',
		{from: deployer, log: true, autoMine: true},
		'debug_reset_exitStartTime',
		location,
	);
}
if (require.main === module) {
	func(hre);
}
