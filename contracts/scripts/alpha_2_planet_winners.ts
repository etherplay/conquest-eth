import {locationToXY, xyToLocation} from 'conquest-eth-common';
import 'dotenv/config';
import {TheGraph} from './utils/thegraph';
import fs from 'fs';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

type Winner = {
  address: string;
  signedMessage?: string;
  signature?: string;
  numTokens: number;
  numWCHI: number;
  numDollars: number;
  // introducer: string;
  discordName?: string;
};

const args = process.argv.slice(2);
const discord = args[0] === 'discord';

const theGraph = new TheGraph(`https://api.thegraph.com/subgraphs/name/${process.env.SUBGRAPH_NAME}`);

let discordMembers: {[id: string]: string} = {};
let claims: {given: string; address: string}[] = [];
if (discord) {
  discordMembers = JSON.parse(fs.readFileSync('discord_members.json').toString());
  claims = JSON.parse(fs.readFileSync('.claimKeys').toString());
}

const rewards = [
  {sponsor: 'pokt', planets: ['82,91', '-118,105', '-52,-142', '139,-170', '-35,-168', '-82,-93']},
  {sponsor: 'xaya', planets: ['-80,-105', '50,39', '85,24', '138,28', '45,41', '-110,105']},
  {sponsor: 'da', planets: ['-98,-122', '-114,-11', '73,13', '-28,156', '-78,-99', '112,-76']},
];

const top18 = [
  '0x41a7ce9d735815f333d9969de8225a6477afca17',
  '0x5a016b206d0314c7ec641c3a6fd89dac7fea010e',
  '0x9dab5a6393eef78eb36cd84bb9bbb055189429a5',
  '0xf8b109af18cfa614bef1c2899e522d77b3c64c14',
  '0x201e7ebafbed52e974414c08a8d81b607572c9c4',
  '0x220de48091afa321299940feb04e6ba31f292f46',
  '0xbd81bbcfd4f700199dc9fd6ed93b1f7be3232703',
  '0x59822bfbdbb179ef2be0ca35c44d9cf58af964bd',
  '0x12bc2dfbd6339746b553bb13e473ea561bd39152',
  '0xfe3865dd730eabfe973b2d9035c4eefed3076a36',
  '0xee2536be571efb5c97472a1b9007b969225b32ed',
  '0xd01a2311ca001241502394d25bc08b0ad8cd2229',
  '0x31ad4033ed83c4f50556213be7e285ce9f99d582',
  '0xb24156b92244c1541f916511e879e60710e30b84',
  '0x5cf7d200b2d82b151d59446d9380682ae6d1ef91',
  '0x2d7420690fd7d5faae7b1c1b15b5bb408eefd833',
  '0x92edc7a4d9e755469fde61815dd229eef7882433',
  '0x3b6319fd9be47d27b02a8d9d356c4a44732f5166',
];

type Player = {id: string; introducer: {id: string}};

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;
  const winners: {[id: string]: {dollars: number; wchi: number; playtoken: number; introducer: string}} = {};

  const playerArray: Player[] = JSON.parse(await deployments.readDotFile('.players.json'));
  const players: {[id: string]: Player} = {};
  for (const player of playerArray) {
    players[player.id.toLowerCase()] = player;
  }

  for (let i = 0; i < top18.length; i++) {
    const topPlayer = top18[i];
    let dollars = 0;
    let wchi = 0;
    let playtoken = 0;

    if (i === 0) {
      dollars = 280;
      wchi = 350;
      playtoken = 1000;
    } else if (i === 1) {
      dollars = 140;
      wchi = 175;
      playtoken = 400;
    } else if (i === 2) {
      dollars = 80;
      wchi = 100;
      playtoken = 200;
    } else if (i === 3) {
      dollars = 60;
      wchi = 75;
      playtoken = 100;
    } else if (i === 4) {
      dollars = 40;
      wchi = 50;
      playtoken = 50;
    } else if (i >= 5 && i <= 9) {
      dollars = 40;
      wchi = 50;
      playtoken = 20;
    } else if (i >= 10 && i <= 16) {
      dollars = 0;
      wchi = 0;
      playtoken = 20;
    } else if (i === 17) {
      dollars = 0;
      wchi = 0;
      playtoken = 10;
    }

    winners[topPlayer] = {
      dollars,
      wchi,
      playtoken,
      introducer: players[topPlayer].introducer.id,
    };
  }

  for (const reward of rewards) {
    const planets = reward.planets.map((v) => {
      const splitted = v.split(',');
      return xyToLocation(parseInt(splitted[0]), parseInt(splitted[1]));
    });

    // console.log({planets});

    const queryString = `
    query($planets: [ID!]! $blockNumber: Int!) {
      exitCompleteEvents(orderBy: timestamp orderDirection: asc block: {number: $blockNumber} where: {planet_in: $planets}) {
        planet {id}
        owner { id}
      }
      planets(block: {number: $blockNumber} where: {id_in: $planets}) {
        id
        owner { id }
      }
    }
    `;

    const result = await theGraph.query(queryString, {
      variables: {planets, blockNumber: 6074693},
    });
    const data = result[0] as {
      exitCompleteEvents: {owner: {id: string}; planet: {id: string}}[];
      planets: {owner: {id: string}; id: string}[];
    };
    const exited = data.exitCompleteEvents;
    const held = data.planets;

    const planetsCounted: {[id: string]: boolean} = {};
    for (const planetExited of exited) {
      if (!planetsCounted[planetExited.planet.id]) {
        winners[planetExited.owner.id] = winners[planetExited.owner.id] || {
          dollars: 0,
          wchi: 0,
          playtoken: 0,
          introducer: players[planetExited.owner.id].introducer.id,
        };
        if (reward.sponsor === 'xaya') {
          winners[planetExited.owner.id].wchi += 250;
        } else {
          winners[planetExited.owner.id].dollars += 100;
        }

        planetsCounted[planetExited.planet.id] = true;
      }
    }

    for (const planetHeld of held) {
      if (!planetsCounted[planetHeld.id]) {
        winners[planetHeld.owner.id] = winners[planetHeld.owner.id] || {
          dollars: 0,
          wchi: 0,
          playtoken: 0,
          introducer: players[planetHeld.owner.id].introducer.id,
        };
        if (reward.sponsor === 'xaya') {
          winners[planetHeld.owner.id].wchi += 250;
        } else {
          winners[planetHeld.owner.id].dollars += 100;
        }
        planetsCounted[planetHeld.id] = true;
      }
    }

    // console.log({
    //   winners,
    //   planetsCounted,
    //   exited,
    //   held,
    // });

    // console.log(token_winners);
    // console.log(winners);

    // for (const tokenWinner of token_winners) {
    //   if (winners[tokenWinner]) {
    //     console.log(`${tokenWinner}: ${winners[tokenWinner]}`);
    //   }
    // }

    for (const loc of planets) {
      if (!planetsCounted[loc]) {
        console.log(`not counted: ${locationToXY(loc)}`);
      }
    }
  }

  let winnersArray: Winner[] = [];
  try {
    winnersArray = JSON.parse(await deployments.readDotFile('.alpha_2_winners.json'));
  } catch (e) {}
  for (const winner of Object.keys(winners)) {
    const found = winnersArray.findIndex((v) => v.address.toLowerCase() === winner);

    let discordName = '';
    if (discord) {
      const claimFound = claims.find((v) => v.address.toLowerCase() === winners[winner].introducer.toLowerCase());
      if (claimFound) {
        discordName = discordMembers[claimFound.given];
      }
    }

    if (found !== -1) {
      winnersArray[found].numWCHI = winners[winner].wchi;
      winnersArray[found].numDollars = winners[winner].dollars;
      winnersArray[found].numTokens = winners[winner].playtoken;
      // winnersArray[found].introducer = winners[winner].introducer;
      if (discord) {
        winnersArray[found].discordName = discordName;
      } else {
        delete winnersArray[found].discordName;
      }
    } else {
      const obj: Winner = {
        address: winner,
        numWCHI: winners[winner].wchi,
        numDollars: winners[winner].dollars,
        numTokens: winners[winner].playtoken,
        // introducer: winners[winner].introducer,
      };
      if (discord) {
        obj.discordName = discordName;
      }
      winnersArray.push(obj);
    }
  }

  let totalToken = 0;
  let totalWCHI = 0;
  let totalDollars = 0;
  for (const winner of winnersArray) {
    totalToken += winner.numTokens;
    totalWCHI += winner.numWCHI;
    totalDollars += winner.numDollars;
  }

  console.log({
    totalToken,
    totalWCHI,
    totalDollars,
  });

  const data = JSON.stringify(winnersArray, null, 2);
  // console.log(data);
  await deployments.saveDotFile('.alpha_2_winners.json', data);
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
