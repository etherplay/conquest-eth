import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
if (args.length === 0) {
	throw new Error(`need to pass a deployment name`);
}
const name = args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {network, deployments} = hre;
	try {
		fs.mkdirSync('metadata');
	} catch (e) {}

	try {
		fs.mkdirSync(path.join('metadata', network.name));
	} catch (e) {}

	const deployment = await deployments.get(name);
	if (!deployment.metadata) {
		throw new Error(`no metadata for ${name}`);
	}
	fs.writeFileSync(
		path.join(
			'metadata',
			network.name,
			`${name}_at_${deployment.address}.json`,
		),
		deployment.metadata,
	);
}
if (require.main === module) {
	func(hre);
}
