import {BigNumber} from '@ethersproject/bignumber';
import {parseEther} from '@ethersproject/units';
import {defaultAbiCoder} from '@ethersproject/abi';
import {
	getUnnamedAccounts,
	deployments,
	getNamedAccounts,
	ethers,
} from 'hardhat';
import {SpaceInfo} from 'conquest-eth-common';
import {FreePlayToken} from '../typechain';
import {setupUsers} from '../utils';

async function main() {
	const {deployer} = await getNamedAccounts();
	const unNamedAccounts = await getUnnamedAccounts();

	const contracts = {
		OuterSpace: await ethers.getContract('OuterSpace'),
		FreePlayToken: <FreePlayToken>await ethers.getContract('FreePlayToken'),
	};
	const OuterSpaceDeployment = await deployments.get('OuterSpace');
	const players = await setupUsers(unNamedAccounts, contracts);

	const spaceInfo = new SpaceInfo(OuterSpaceDeployment.linkedData);

	let planetPointer;
	for (let i = 0; i < 1500; i++) {
		const outerSpaceContract = await deployments.get('OuterSpace');
		planetPointer = spaceInfo.findNextPlanet(planetPointer);
		const {state} = await deployments.read(
			'OuterSpace',
			'getPlanet',
			planetPointer.data.location.id,
		);
		if (state.owner !== '0x0000000000000000000000000000000000000000') {
			i--;
			continue;
		}
		const player = deployer; // players[i % 4].address;
		await deployments.execute(
			'FreePlayToken',
			{from: player, log: true, autoMine: true},
			'transferAndCall',
			outerSpaceContract.address,
			BigNumber.from(planetPointer.data.stats.stake).mul('1000000000000000000'),
			defaultAbiCoder.encode(
				['address', 'uint256'],
				[player, planetPointer.data.location.id],
			),
		);
		console.log(
			`staked: ${planetPointer.data.location.id}, (${planetPointer.data.location.x},${planetPointer.data.location.y})`,
		);
	}
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
