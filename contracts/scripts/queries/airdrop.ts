import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import {BigNumber} from 'ethers';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;
  const theGraph = new TheGraph(`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`);
  // query($blockNumber: Int! $first: Int! $lastId: ID! $id: ID!) {
  const queryString = `
query($first: Int! $lastId: ID!) {
    owners(first: $first where: {
      #totalStaked_gt: 0
      id_gt: $lastId
      totalStaked_gt: 0
      id_not: "0x0000000000000000000000000000000000000000"
      tokenGiven_gt: "0"
      tokenGiven_lte: "400000000000000000000"

    }) {
      id
      introducer { id }
      tokenGiven
    }
}
`;

  const players: {
    id: string;
    introducer: {id: string};
    tokenGiven: string;
  }[] = await theGraph.query(queryString, {field: 'owners'});

  // const claimKeysqueryString = `
  // query($first: Int! $lastId: ID!) {
  //     owners(first: $first where: {
  //       id_gt: $lastId
  //       totalStaked: 0
  //       id_not: "0x0000000000000000000000000000000000000000"
  //       balance: "300000000000000000000"
  //       tokenGiven: "300000000000000000000"
  //     }) {
  //       id
  //       introducer { id }
  //       tokenGiven
  //     }
  // }
  // `;

  // const claimkeys: {
  //   id: string;
  //   introducer: {id: string};
  //   tokenGiven: string;
  // }[] = await theGraph.query(queryString, {field: 'owners'});

  // let introducer = undefined;
  // for (const claimKey of claimkeys) {
  //   if (introducer !== claimKey.introducer.id) {
  //     introducer = claimKey.introducer.id;
  //     console.log({introducer});
  //   }
  // }

  // const list = players.concat(claimkeys);

  const list = players;

  const airdrop: {address: string; tokenUnitGivenSoFar: number}[] = [];
  for (const account of list) {
    const tokenUnitGivenSoFar = BigNumber.from(account.tokenGiven).div('1000000000000000000').toNumber();
    airdrop.push({address: account.id, tokenUnitGivenSoFar});
  }

  await deployments.saveDotFile('.airdrop.json', JSON.stringify(airdrop, null, 2));
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
