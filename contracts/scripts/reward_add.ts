import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {xyToLocation, locationToXY} from 'conquest-eth-common';

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error(`need to pass the addresses to send to`);
}
let location = args[0];

if (args.length === 1) {
  throw new Error(`need to pass sponsor name`);
}
const sponsor = args[1];
let giverAddress: string | undefined;
if (sponsor === 'xaya') {
  giverAddress = '0xdddddddddddddddddddddddddddddddddddddddd';
} else if (sponsor === 'pokt') {
  giverAddress = '0x1111111111111111111111111111111111111111';
} else if (sponsor === 'da') {
  giverAddress = '0x2222222222222222222222222222222222222222';
}

if (!giverAddress) {
  throw new Error(`unknown sponsor: ${sponsor}`);
}

if (location.indexOf(',') !== -1) {
  const [x, y] = location.split(',').map((v) => parseInt(v));
  location = xyToLocation(x, y);
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployer} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;
  const OuterSpace = await hre.ethers.getContract('OuterSpace');
  const state = await OuterSpace.callStatic.getPlanet(location);

  const {x, y} = locationToXY(location);
  if (state.state.reward.gt(0)) {
    console.log(`reward already added to (${x},${y}) (${location})`);
    return;
  } else if (state.state.lastUpdated > 0) {
    console.log(`planet already colonized: (${x},${y}) (${location})`);
    return;
  }

  await execute('OuterSpace', {from: deployer, log: true, autoMine: true}, 'addReward', location, giverAddress);
}
if (require.main === module) {
  func(hre);
}
