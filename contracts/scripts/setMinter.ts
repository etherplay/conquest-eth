import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error(`need to pass the address`);
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployer} = await hre.getNamedAccounts();
  const {read, execute} = hre.deployments;

  const minterToBe = args[0];

  const isMinter = await read('FreePlayToken', 'minters', minterToBe);
  if (!isMinter) {
    await execute('FreePlayToken', {from: deployer, log: true, autoMine: true}, 'setMinter', minterToBe, true);
  }
}
if (require.main === module) {
  func(hre);
}
