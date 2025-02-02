import hre from 'hardhat';
import fs from 'fs';
import {formatEther} from '@ethersproject/units';

async function func(addresses: string[]): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;

  const {deployer} = await getNamedAccounts();

  const balanceBefore = await read('PlayToken', 'balanceOf', deployer);

  if (!addresses[0].startsWith('0x')) {
    const tokendue = JSON.parse(fs.readFileSync(addresses[0], 'utf8'));
    addresses = [];
    for (const address of Object.keys(tokendue)) {
      addresses.push(address);
    }
  }

  await execute(
    'FreePlayTokenClaim',
    {
      from: deployer,
      log: true,
      autoMine: true,
    },
    'withdrawAllUnderlyingToken',
    addresses,
    deployer
  );

  const balanceAfter = await read('PlayToken', 'balanceOf', deployer);

  console.log(`${formatEther(balanceBefore)} => ${formatEther(balanceAfter)}`);
}
if (require.main === module) {
  const args = process.argv.slice(2);
  func(args);
}
