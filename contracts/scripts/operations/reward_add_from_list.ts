import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {locationToXY} from 'conquest-eth-common';

const args = process.argv.slice(2);

// if no giver, it just check validity
// if (args.length === 0) {
//   throw new Error(`need to pass sponsor name`);
// }
const sponsor = args[0];

let giverAddress: string | undefined;
if (sponsor === 'xaya') {
  giverAddress = '0xdddddddddddddddddddddddddddddddddddddddd';
} else if (sponsor === 'pokt') {
  giverAddress = '0x1111111111111111111111111111111111111111';
} else if (sponsor === 'gnosis') {
  giverAddress = '0x2222222222222222222222222222222222222222';
} else if (sponsor === 'soccerverse') {
  giverAddress = '0x3333333333333333333333333333333333333333';
} else if (sponsor === 'blockscout') {
  giverAddress = '0x4444444444444444444444444444444444444444';
} else if (sponsor === 'cafecosmos') {
  giverAddress = `0x5555555555555555555555555555555555555555`;
} else if (sponsor === 'gg.xyz') {
  giverAddress = `0x6666666666666666666666666666666666666666`;
} else if (sponsor === 'infinite-seas') {
  giverAddress = `0x7777777777777777777777777777777777777777`;
} else if (sponsor === 'mithril') {
  giverAddress = `0x8888888888888888888888888888888888888888`;
} else {
  throw new Error(`no sponsor selected`);
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const planets = JSON.parse(await hre.deployments.readDotFile('.planets-chosen.json'));

  // if (sponsor === 'xaya') {
  //   if (planets.length !== 5) {
  //     throw new Error(`5 required`);
  //   }
  // } else
  if (sponsor === 'blockscout') {
    // if (planets.length !== 4) {
    throw new Error(`4 required`);
    // }
  } else if (sponsor == 'gg.xyz') {
    // if (planets.length !== 3) {
    throw new Error(`3 required`);
    // }
  } else if (sponsor === 'infinite-seas') {
    // if (planets.length !== 5) {
    throw new Error(`5 required`);
    // }
  } else {
    throw new Error(`no number of planet specified`);
  }

  const {deployer} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;

  const locations: string[] = [];
  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    const OuterSpace = await hre.ethers.getContract('OuterSpace');
    const state = await OuterSpace.callStatic.getPlanet(planet.location);

    const {x, y} = locationToXY(planet.location);
    if (state.state.reward.gt(0)) {
      console.log(`reward already added to (${x},${y}) (${planet.location})`);
      continue;
    } else if (state.state.lastUpdated > 0) {
      console.error(`planet already colonized: (${x},${y}) (${planet.location})`);
      process.exit(1);
    }
    locations.push(planet.location);
  }

  console.log(locations);
  console.log(locations.map(locationToXY));

  const receipt = await execute(
    'OuterSpace',
    {from: deployer, log: true, autoMine: true, maxFeePerGas: '10000000000', maxPriorityFeePerGas: '5000000000'},
    'addMultipleRewardViaAdmin',
    locations,
    giverAddress
  );
  console.log(receipt.transactionHash);
}
if (require.main === module) {
  func(hre);
}
