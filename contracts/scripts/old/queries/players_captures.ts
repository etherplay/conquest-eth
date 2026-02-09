import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {getTHEGRAPH} from './utils';
import {SpaceInfo} from 'conquest-eth-common';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {deployments} = hre;
	const theGraph = await getTHEGRAPH(hre);

	const args = process.argv.slice(2);
	const fromBlock = parseInt(args[0]);
	const toBlock = parseInt(args[1]);

	if (!fromBlock || !toBlock) {
		throw new Error('Missing fromBlock or toBlock');
	}

	const latestBlockNnmber = await hre.ethers.provider.getBlockNumber();

	if (toBlock > latestBlockNnmber - 12) {
		throw new Error('toBlock is too recent');
	}

	const OuterSpace = await deployments.get('OuterSpace');

	const spaceInfo = new SpaceInfo(OuterSpace.linkedData);

	const queryString = `
query($fromBlock: Int! $toBlock: Int! $first: Int! $lastId: ID!) {
  fleetArrivedEvents(first: $first block: {number: $toBlock} where: { id_gt: $lastId blockNumber_gte: $fromBlock blockNumber_lte: $toBlock   }){
    id
    planetActive
    won
    owner {id}
    sender {id}
    gift
    destinationOwner {id}
    quantity
    from {id}
    # planet {
    #   stakeDeposited
    # }
    planet {
      x
      y
    }
  }
}
`;

	const fleetArrivedEvents: {
		id: string;
		planetActive: boolean;
		won: boolean;
		owner: {id: string};
		sender: {id: string};
		gift: boolean;
		destinationOwner: {id: string};
		quantity: string;
		from: {id: string};
		// planet: {
		//   stakeDeposited: string;
		// };
		planet: {x: number; y: number};
	}[] = await theGraph.query(queryString, {
		field: 'fleetArrivedEvents',
		variables: {
			fromBlock: fromBlock,
			toBlock: toBlock,
		},
	});

	const capturingEvents = fleetArrivedEvents.filter(
		(event) => event.won && event.planetActive,
	);

	const players_captures: {
		playerAddress: string;
		amountCaptured: string;
		numPlanetsCaptured: number;
	}[] = [];

	for (const event of capturingEvents) {
		const playerAddress = event.owner.id;

		// const amountCaptured = event.planet.stakeDeposited;
		const planetInfo = spaceInfo.getPlanetInfo(event.planet.x, event.planet.y);
		if (!planetInfo) {
			throw new Error(`no planet at ${event.planet.x}, ${event.planet.y}`);
		}
		const amountCaptured = (
			BigInt(planetInfo.stats.stake) * 100000000000000n
		).toString();
		const numPlanetsCaptured = 1;
		const playerCapture = players_captures.find(
			(player) => player.playerAddress === playerAddress,
		);
		if (playerCapture) {
			playerCapture.amountCaptured = (
				BigInt(playerCapture.amountCaptured) + BigInt(amountCaptured)
			).toString();
			playerCapture.numPlanetsCaptured += numPlanetsCaptured;
		} else {
			players_captures.push({
				playerAddress,
				amountCaptured,
				numPlanetsCaptured,
			});
		}
	}

	await deployments.saveDotFile(
		'.players_captures.json',
		JSON.stringify(players_captures, null, 2),
	);
	//   await deployments.saveDotFile('.fleetArrivedEvents.json', JSON.stringify(fleetArrivedEvents, null, 2));
	console.log({numcapturingEvents: capturingEvents.length});
}

async function main() {
	await func(hre);
}

if (require.main === module) {
	main();
}
