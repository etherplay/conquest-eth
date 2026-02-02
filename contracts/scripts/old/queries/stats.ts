import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {ethers} from 'hardhat';
import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import ProgressBar from 'progress';

import {PlayerData, BlockData} from './types';

function wait(numSec: number): Promise<void> {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, numSec * 1000);
	});
}

// import rdl from 'readline';
// class LoadingBar {
//   constructor(private size: number) {
//     this.size = size;
//     process.stdout.write('\x1B[?25l');
//     for (let i = 0; i < this.size; i++) {
//       process.stdout.write('\u2591');
//     }
//     rdl.cursorTo(process.stdout, 0, 0);
//   }
//   increase() {
//     process.stdout.write('\u2588');
//   }
// }
// const ld = new LoadingBar(100);

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
	const {deployments} = hre;
	const theGraph = new TheGraph(
		`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`,
	);

	// query($blockNumber: Int! $first: Int! $lastId: ID! $id: ID!) {
	const queryString = `
query($first: Int! $lastId: ID! $blockNumber: Int!) {
    owners(
      block: {number: $blockNumber}
      first: $first
      where: {
        totalStaked_gt: 0
        id_gt: $lastId
      }
    ) {

      id
      planets(first: 1000) {
        id
        numSpaceships
        flagTime
        lastUpdated
        owner {id}
        active
        exitTime
      }

      # rewards: [Reward]!
      ## TODO rewardAmount ?

      # alliances: [AllianceOwnerPair!]!



      totalStaked
      currentStake
      totalCollected
      tokenBalance
      tokenToWithdraw
      tokenGiven
      introducer { id }
      stake_gas
      stake_num
      sending_gas
      sending_num
      resolving_gas
      resolving_num
      exit_attempt_gas
      exit_attempt_num

      spaceships_sent
      spaceships_arrived
      spaceships_self_transfered
      gift_spaceships_sent
      gift_spaceships_receieved
      attack_own_spaceships_destroyed
      attack_enemy_spaceships_destroyed
      defense_own_spaceships_destroyed
      defense_enemy_spaceships_destroyed
      planets_conquered
      planets_lost
    }
}
`;

	const stats: BlockData[] = [];
	const start = 5977167;
	const end = 6074693; // 6074693: last block on December 23rd 10pm UTC
	let blockNumber = start;
	let lastPercent = 0;
	const bar = new ProgressBar('  fetching [:bar] :percent', {
		complete: '=',
		incomplete: ' ',
		width: 100,
		total: 100,
	});
	while (blockNumber <= end) {
		const block = await ethers.provider.getBlock(blockNumber);

		const players: PlayerData[] = await theGraph.query(queryString, {
			field: 'owners',
			variables: {blockNumber},
		});
		stats.push({blockNumber, players, blockTime: block.timestamp});

		// await wait(0.3);

		const percentage = Math.floor(
			((blockNumber - start) / (end - start)) * 100,
		);
		if (lastPercent != percentage) {
			// console.log(`${percentage}%`);
			// ld.increase();
			bar.tick();
			lastPercent = percentage;
		}
		if (blockNumber == end) {
			blockNumber++;
		} else {
			blockNumber = Math.min(end, blockNumber + 100);
		}
	}
	console.log();

	// avoid RangeError by stringify per elem, see: https://dev.to/madhunimmo/json-stringify-rangeerror-invalid-string-length-3977
	const out = '[' + stats.map((el) => JSON.stringify(el)).join(',') + ']';

	await deployments.saveDotFile('.stats.json', out);
	console.log({numDataPointsPerPlayer: stats.length});
}

async function main() {
	await func(hre);
}

if (require.main === module) {
	main();
}
