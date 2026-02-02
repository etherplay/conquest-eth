import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {SpaceInfo, xyToLocation} from 'conquest-eth-common';
import fs from 'fs';
import {formatEther, parseEther} from '@ethersproject/units';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {ethers, deployments} = hre;
	const OuterSpace = await ethers.getContract('OuterSpace');
	const OuterSpaceDeployment = await deployments.get('OuterSpace');
	const spaceInfo = new SpaceInfo(OuterSpaceDeployment.linkedData);

	const discovered = await OuterSpace.callStatic.getDiscovered();

	console.log(discovered);

	const minStake = BigInt(parseEther('11').toHexString());

	const planetsInBound: {x: number; y: number; location: string}[] = [];
	// const emptyPlanets: {x: number; y: number; location: string}[] = [];
	// const usedPlanets: {x: number; y: number; location: string}[] = [];
	for (let x = -discovered.minX; x <= discovered.maxX; x++) {
		if (x > -64 && x < 64) {
			continue;
		}
		for (let y = -discovered.minY; y <= discovered.maxY; y++) {
			if (y > -64 && y < 64) {
				continue;
			}
			const location = xyToLocation(x, y);
			const planet = spaceInfo.getPlanetInfo(x, y);

			if (planet) {
				const stake = BigInt(planet.stats.stake) * 100000000000000n;
				if (stake >= minStake) {
					planetsInBound.push({x, y, location});
					// console.log(`checking planet at ${x}, ${y}...`);
					// const state = await OuterSpace.callStatic.getPlanet(location);
					// if (state.state.lastUpdated == 0) {
					//   // console.log({state: state.state});
					//   emptyPlanets.push({
					//     x,
					//     y,
					//     location,
					//   });
					// } else {
					//   usedPlanets.push({
					//     x,
					//     y,
					//     location,
					//   });
					//   console.log(`used planet at ${x}, ${y}`);
					// }
				}
			}
		}
	}
	// const data = JSON.stringify({emptyPlanets, usedPlanets}, null, 2);
	// console.log(data);
	// fs.writeFileSync('../planets.json', data);

	const totalStake = BigInt(parseEther('119').toHexString());
	let stake = 0n;
	const planetsChosen = [];
	const alreadyIn: {[key: string]: boolean} = {};
	while (stake < totalStake) {
		const num = planetsInBound.length;
		const index = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) % num;
		const chosenPlanet = planetsInBound[index];
		planetsInBound.splice(index, 1);

		if (alreadyIn[chosenPlanet.location]) {
			console.log(`alreadt picked ${chosenPlanet.x},${chosenPlanet.y}`);
			continue;
		}

		const state = await OuterSpace.callStatic.getPlanet(chosenPlanet.location);
		const stakedAdded = BigInt(state.stats.stake) * 100000000000000n;

		stake += stakedAdded;

		// if (stake > totalStake + 1n) {
		//   stake -= stakedAdded;
		// } else {
		console.log(
			`- (${chosenPlanet.x},${chosenPlanet.y}) + ${formatEther(stakedAdded)}`,
		);
		planetsChosen.push(chosenPlanet);
		alreadyIn[chosenPlanet.location] = true;
		// }
	}

	await deployments.saveDotFile(
		'.planets-chosen.json',
		JSON.stringify(planetsChosen, null, 2),
	);

	for (const planet of planetsChosen) {
		console.log(`- (${planet.x},${planet.y})`);
	}
}
if (require.main === module) {
	func(hre);
}
