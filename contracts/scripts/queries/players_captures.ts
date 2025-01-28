import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;

  const chainId = await hre.getChainId();
  let chainName = 'unknown';
  if (chainId == '100') {
    chainName = 'gnosis';
  }

  const theGraph = new TheGraph(
    `https://subgraphs.etherplay.io/${chainName}/subgraphs/name/${process.env.SUBGRAPH_NAME}`
  );

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
    planet {
      stakeDeposited
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
    planet: {
      stakeDeposited: string;
    };
  }[] = await theGraph.query(queryString, {
    field: 'fleetArrivedEvents',
    variables: {
      fromBlock: fromBlock,
      toBlock: toBlock,
    },
  });

  const capturingEvents = fleetArrivedEvents.filter((event) => event.won && event.planetActive);

  const players_captures: {playerAddress: string; amountCapture: string; numPlanetsCaptured: number}[] = [];

  for (const event of capturingEvents) {
    const playerAddress = event.owner.id;
    const amountCapture = event.planet.stakeDeposited;
    const numPlanetsCaptured = 1;
    const playerCapture = players_captures.find((player) => player.playerAddress === playerAddress);
    if (playerCapture) {
      playerCapture.amountCapture = (BigInt(playerCapture.amountCapture) + BigInt(amountCapture)).toString();
      playerCapture.numPlanetsCaptured += numPlanetsCaptured;
    } else {
      players_captures.push({playerAddress, amountCapture, numPlanetsCaptured});
    }
  }

  await deployments.saveDotFile('.players_captures.json', JSON.stringify(players_captures, null, 2));
  //   await deployments.saveDotFile('.fleetArrivedEvents.json', JSON.stringify(fleetArrivedEvents, null, 2));
  console.log({numcapturingEvents: capturingEvents.length});
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
