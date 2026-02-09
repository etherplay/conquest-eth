import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {defaultAbiCoder} from '@ethersproject/abi';
import hre from 'hardhat';
import {PlanetInfo, SpaceInfo, xyToLocation} from 'conquest-eth-common';
import {BigNumber} from 'ethers';
import {formatEther} from '@ethersproject/units';

// (-92,-90)
// (82,71)
// (89,85)
// (93,79)
// (104,-114)
// (112,-109)
// (-69,-98)
// (-83,-73)
// (-143,-114)
// (-116,73)

const clusters = [
	{
		main: {x: -92, y: -90},
		satellites: [
			{x: -94, y: -90},
			{x: -91, y: -88},
			{x: -90, y: -88},
			{x: -89, y: -92},
			{x: -93, y: -94},
		],
	},
];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {execute, read, get} = hre.deployments;
	const {deployer} = await hre.getNamedAccounts();
	const OuterSpace = await get('OuterSpace');
	const BrainLess = await get('BrainLess');
	const spaceInfo = new SpaceInfo(OuterSpace.linkedData);

	const cluster = clusters[0]; // TODO i ?

	const planet = spaceInfo.getPlanetInfo(
		cluster.main.x,
		cluster.main.y,
	) as PlanetInfo;
	const stake = BigNumber.from(planet.stats.stake).mul('100000000000000');

	const locations = [xyToLocation(cluster.main.x, cluster.main.y)];
	let totalStake = stake;
	for (const satellite of cluster.satellites) {
		const satellitePlanet = spaceInfo.getPlanetInfo(
			satellite.x,
			satellite.y,
		) as PlanetInfo;
		const satelliteStake = BigNumber.from(satellitePlanet.stats.stake).mul(
			'100000000000000',
		);
		totalStake = totalStake.add(satelliteStake);
		locations.push(xyToLocation(satellite.x, satellite.y));
	}

	console.log(`totalStake : ${formatEther(totalStake)}`);

	await execute(
		'PlayToken',
		{from: deployer, log: true},
		'transferAndCall',
		OuterSpace.address,
		totalStake,
		defaultAbiCoder.encode(
			['address', 'uint256[]'],
			[BrainLess.address, locations],
		),
	);

	const points = await read('RewardsGenerator', 'balanceOf', BrainLess.address);
	console.log({
		points: formatEther(points),
	});
}
if (require.main === module) {
	func(hre);
}
