import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error(`need to pass the addresses to send to`);
}
const location = args[0];

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {read} = hre.deployments;
  const planet = await read('OuterSpace', 'getPlanet', location);
  console.log(JSON.stringify(planet, null, 2));
}
if (require.main === module) {
  func(hre);
}
