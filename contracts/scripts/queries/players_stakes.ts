import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {getTHEGRAPH} from './utils';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;

  const theGraph = await getTHEGRAPH(hre);
  const args = process.argv.slice(2);
  const fromBlock = parseInt(args[0]);

  if (!fromBlock || !args[1]) {
    throw new Error('Missing fromBlock or toBlock');
  }

  const latestBlockNnmber = await hre.ethers.provider.getBlockNumber();

  const toBlock = args[1] === 'latest' ? latestBlockNnmber - 12 : parseInt(args[1]);
  if (toBlock > latestBlockNnmber - 12) {
    throw new Error('toBlock is too recent');
  }

  const queryString = `
query($fromBlock: Int! $toBlock: Int! $first: Int! $lastId: ID!) {
  planetStakeEvents(first: $first block: {number: $toBlock} where: { id_gt: $lastId blockNumber_gte: $fromBlock blockNumber_lte: $toBlock   }){
    id
    owner {id}
    stake
  }
}
`;

  const planetStakeEvents: {
    id: string;
    owner: {id: string};
    // planet: {
    //   stakeDeposited: string;
    // };
    stake: string;
  }[] = await theGraph.query(queryString, {
    field: 'planetStakeEvents',
    variables: {
      fromBlock: fromBlock,
      toBlock: toBlock,
    },
  });

  const players_stakes: {playerAddress: string; amountStaked: string; numPlanetsStaked: number}[] = [];

  for (const event of planetStakeEvents) {
    const playerAddress = event.owner.id;
    // if (event.planet.stakeDeposited != event.stake) {
    //   throw new Error(`mismarch planet.stakeDeposited=${event.planet.stakeDeposited} != event.stake=${event.stake}`);
    // }
    const amountStaked = event.stake;
    const numPlanetsStaked = 1;
    const playerCapture = players_stakes.find((player) => player.playerAddress === playerAddress);
    if (playerCapture) {
      playerCapture.amountStaked = (BigInt(playerCapture.amountStaked) + BigInt(amountStaked)).toString();
      playerCapture.numPlanetsStaked += numPlanetsStaked;
    } else {
      players_stakes.push({playerAddress, amountStaked, numPlanetsStaked});
    }
  }

  await deployments.saveDotFile('.players_stakes.json', JSON.stringify(players_stakes, null, 2));
  //   await deployments.saveDotFile('.fleetArrivedEvents.json', JSON.stringify(fleetArrivedEvents, null, 2));
  console.log({numPlanetStakeEvents: planetStakeEvents.length, numPlayers: players_stakes.length});
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
