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
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const planets = JSON.parse(await hre.deployments.readDotFile('.planets-chosen.json'));

  if (sponsor === 'xaya') {
    if (planets.length !== 8) {
      throw new Error(`8 required`);
    }
  } else {
    if (planets.length !== 7) {
      throw new Error(`7 required`);
    }
  }

  const {deployer} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;
  for (let i = 0; i < planets.length; i++) {
    const planet = planets[i];
    // let giverAddress: string | undefined;
    // if (i % 3 == 0) {
    // } else if (i % 3 == 1) {
    // } else if (i % 3 == 2) {
    // }

    // if (!giverAddress) {
    //   throw new Error(`no giverAddress`);
    // }

    const OuterSpace = await hre.ethers.getContract('OuterSpace');
    const state = await OuterSpace.callStatic.getPlanet(planet.location);

    const {x, y} = locationToXY(planet.location);
    if (state.state.reward.gt(0)) {
      console.log(`reward already added to (${x},${y}) (${planet.location})`);
      continue;
    } else if (state.state.lastUpdated > 0) {
      console.log(`planet already colonized: (${x},${y}) (${planet.location})`);
      continue;
    }

    if (!giverAddress) {
      console.log(`no giver specified`);
      continue;
    }

    console.log(planet.location);
    const receipt = await execute(
      'OuterSpace',
      {from: deployer, log: true, autoMine: true, maxFeePerGas: '10000000000', maxPriorityFeePerGas: '5000000000'},
      'addReward',
      planet.location,
      giverAddress
    );
    console.log(receipt.transactionHash);
  }
}
if (require.main === module) {
  func(hre);
}
