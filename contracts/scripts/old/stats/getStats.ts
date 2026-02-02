import 'dotenv/config';
import {TheGraph} from '../utils/thegraph';
import {BigNumber} from '@ethersproject/bignumber';
import fs from 'fs';

const theGraph = new TheGraph(
	`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`,
);

type QueryPlayer = {
	id: string;
	totalStaked: string;
	currentStake: string;
	totalCollected: string;
	tokenBalance: string;
	tokenToWithdraw: string;
	tokenGiven: string;
	stake_gas: string;
	stake_num: string;
	sending_gas: string;
	sending_num: string;
	resolving_gas: string;
	resolving_num: string;
	exit_attempt_gas: string;
	exit_attempt_num: string;
};

type QuerySpace = {
	stake_gas: string;
	stake_num: string;
	sending_gas: string;
	sending_num: string;
	resolving_gas: string;
	resolving_num: string;
	exit_attempt_gas: string;
	exit_attempt_num: string;
};

type QueryResult = {
	owners: QueryPlayer[];
	space: QuerySpace;
};

// query($blockNumber: Int! $first: Int! $lastId: ID! $id: ID!) {
//totalStaked_gt: 0
const queryString = `
query($first: Int! $lastId: ID!) {
  owners(first: $first block: {number:4830319} where: {
    id_gt: $lastId
  }) {
    id
    totalStaked
    currentStake
    totalCollected
    tokenBalance
    tokenToWithdraw
    tokenGiven
    stake_gas
    stake_num
    sending_gas
    sending_num
    resolving_gas
    resolving_num
    exit_attempt_gas
    exit_attempt_num
  }
  space(id: "Space") {
    stake_gas
    stake_num
    sending_gas
    sending_num
    resolving_gas
    resolving_num
    exit_attempt_gas
    exit_attempt_num
  }
}
`;

const DECIMALS_18 = BigNumber.from('1000000000000000000');

async function main() {
	const result = await theGraph.complexQuery<QueryResult>(queryString, {
		list: {
			path: 'owners',
		},
	});
	console.log(result?.space);
	// if (result) {
	//   const winners = result.owners
	//     .map((p) => {
	//       const currentStake = BigNumber.from(p.currentStake);
	//       const tokenToWithdraw = BigNumber.from(p.tokenToWithdraw);
	//       const tokenBalance = BigNumber.from(p.tokenBalance);
	//       const tokenGiven = BigNumber.from(p.tokenGiven);

	//       if (BigNumber.from(p.totalStaked).eq(0)) {
	//         return {
	//           id: p.id,
	//           total: 0,
	//           score: 0,
	//           currentStake: currentStake.div(DECIMALS_18).toNumber(),
	//           tokenToWithdraw: tokenToWithdraw
	//             .div(DECIMALS_18)
	//             .toNumber(),
	//           tokenBalance: tokenBalance.div(DECIMALS_18).toNumber(),
	//           tokenGiven: tokenGiven.div(DECIMALS_18).toNumber(),
	//         };
	//       }
	//       const total = currentStake
	//         .add(tokenToWithdraw)
	//         .add(tokenBalance);
	//       return {
	//         id: p.id,
	//         total: total.div(DECIMALS_18).toNumber(),
	//         score: total
	//           .sub(tokenGiven)
	//           .mul(1000000)
	//           .div(tokenGiven)
	//           .toNumber(),
	//         currentStake: currentStake.div(DECIMALS_18).toNumber(),
	//         tokenToWithdraw: tokenToWithdraw.div(DECIMALS_18).toNumber(),
	//         tokenBalance: tokenBalance.div(DECIMALS_18).toNumber(),
	//         tokenGiven: tokenGiven.div(DECIMALS_18).toNumber(),
	//       };
	//     })
	//     .sort((a, b) => b.score - a.score);

	//   const top18 = winners.slice(0, 18);
	//   console.log(top18);

	//   console.log(top18.map((v) => v.id));

	//   const winnersWithReward: {[id: string]: number} = {};
	//   const tokenDistribution = [
	//     500, 200, 100, 50, 25, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 5,
	//   ];
	//   for (let i = 0; i < top18.length; i++) {
	//     winnersWithReward[top18[i].id] = tokenDistribution[i];
	//   }
	//   console.log(winnersWithReward);

	//   let winnersArray: {
	//     address: string;
	//     signedMessage?: string;
	//     signature?: string;
	//     numTokens: number;
	//     numWCHI?: number;
	//   }[] = [];
	//   try {
	//     winnersArray = JSON.parse(fs.readFileSync('winners.json').toString());
	//   } catch (e) {}
	//   for (const winner of Object.keys(winnersWithReward)) {
	//     const found = winnersArray.findIndex(
	//       (v) => v.address.toLowerCase() === winner
	//     );
	//     if (found !== -1) {
	//       winnersArray[found].numTokens = winnersWithReward[winner];
	//     } else {
	//       winnersArray.push({
	//         address: winner,
	//         numTokens: winnersWithReward[winner],
	//       });
	//     }
	//   }
	//   fs.writeFileSync('winners.json', JSON.stringify(winnersArray, null, 2));
	// }
}

main();
