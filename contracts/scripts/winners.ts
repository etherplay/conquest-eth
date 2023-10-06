import 'dotenv/config';
import {TheGraph} from './utils/thegraph';
import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs';
import {deployments} from 'hardhat';

const theGraph = new TheGraph(`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`);

// query($blockNumber: Int! $first: Int! $lastId: ID! $id: ID!) {
const queryString = `
query($first: Int! $lastId: ID!) {
  owners(first: $first block: {number:21538868} where: {
    totalStaked_gt: 0
    id_gt: $lastId
  }) {
    id
    currentStake
    tokenToWithdraw
    tokenBalance
    tokenGiven
  }
}
`;

const DECIMALS_18 = BigNumber.from('1000000000000000000');

async function main() {
  const players: {
    id: string;
    currentStake: string;
    tokenToWithdraw: string;
    tokenBalance: string;
    tokenGiven: string;
  }[] = await theGraph.query(queryString, {field: 'owners'});
  const winners = players
    .map((p) => {
      const currentStake = BigNumber.from(p.currentStake);
      const tokenToWithdraw = BigNumber.from(p.tokenToWithdraw);
      const tokenBalance = BigNumber.from(p.tokenBalance);
      const tokenGiven = BigNumber.from(p.tokenGiven);
      const total = currentStake.add(tokenToWithdraw).add(tokenBalance);
      return {
        id: p.id,
        total: total.div(DECIMALS_18).toNumber(),
        score: total.sub(tokenGiven).mul(1000000).div(tokenGiven).toNumber(),
        currentStake: currentStake.div(DECIMALS_18).toNumber(),
        tokenToWithdraw: tokenToWithdraw.div(DECIMALS_18).toNumber(),
        tokenBalance: tokenBalance.div(DECIMALS_18).toNumber(),
        tokenGiven: tokenGiven.div(DECIMALS_18).toNumber(),
      };
    })
    .sort((a, b) => b.score - a.score);

  const top18 = winners.slice(0, 18);
  console.log(top18);

  console.log(top18.map((v) => v.id));

  const winnersWithReward: {[id: string]: number} = {};
  const tokenDistribution = [1100, 550, 300, 125, 70, 65, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5];
  for (let i = 0; i < top18.length; i++) {
    winnersWithReward[top18[i].id] = tokenDistribution[i];
  }
  console.log(winnersWithReward);

  let winnersArray: {
    address: string;
    signedMessage?: string;
    signature?: string;
    numTokens: number;
    numWCHI?: number;
  }[] = [];
  try {
    winnersArray = JSON.parse(await deployments.readDotFile('.winners.json'));
  } catch (e) {}
  for (const winner of Object.keys(winnersWithReward)) {
    const found = winnersArray.findIndex((v) => v.address.toLowerCase() === winner);
    if (found !== -1) {
      winnersArray[found].numTokens = winnersWithReward[winner];
    } else {
      winnersArray.push({
        address: winner,
        numTokens: winnersWithReward[winner],
      });
    }
  }
  await deployments.saveDotFile('.winners.json', JSON.stringify(winnersArray, null, 2));
}

main();
