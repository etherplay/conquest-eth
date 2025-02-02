import hre from 'hardhat';
import fs from 'fs';
import {formatEther} from '@ethersproject/units';
import {BigNumber} from 'ethers';

async function func(file: string): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;

  const {deployer} = await getNamedAccounts();

  const networkName = await hre.deployments.getNetworkName();
  // TODO use network tags ?
  const localTesting = networkName === 'hardhat' || networkName === 'localhost'; // chainId === '1337' || chainId === '31337';

  if (file.startsWith('fake') && !localTesting) {
    throw new Error(`fake data can only be used in local`);
  }

  const PlayToken = await deployments.get('PlayToken');
  const numTokensPerNativeTokenAt18Decimals = BigNumber.from(PlayToken.linkedData.numTokensPerNativeTokenAt18Decimals);

  const tokendue = JSON.parse(fs.readFileSync(file, 'utf8'));
  const claims: {to: string; amount: BigNumber}[] = [];
  let totalValue = BigNumber.from(0);

  for (const address of Object.keys(tokendue)) {
    let numTokens = BigNumber.from(tokendue[address].numTokens);
    if (numTokens.gt(50)) {
      numTokens = BigNumber.from(50);
    }
    const amount = numTokens.mul('1000000000000000000');
    claims.push({to: address, amount});
    totalValue = totalValue.add(amount.mul('1000000000000000000').div(numTokensPerNativeTokenAt18Decimals));
  }
  console.log(`num claims: ${claims.length}`);
  console.log(
    claims.map((v) => ({
      to: v.to,
      amount: formatEther(v.amount),
      value: formatEther(v.amount.mul('1000000000000000000').div(numTokensPerNativeTokenAt18Decimals)),
    }))
  );

  console.log({value: formatEther(totalValue)});
  console.log({deployer});
  console.log({deployerBalance: formatEther(await hre.ethers.provider.getBalance(deployer))});
  await execute(
    'FreePlayTokenClaim',
    {
      from: deployer,
      log: true,
      autoMine: true,
      value: totalValue,
    },
    'mintMultipleViaNativeToken',
    claims
  );

  const balance = await read('FreePlayTokenClaim', 'balanceOf', claims[0].to);

  console.log(formatEther(balance));
}
if (require.main === module) {
  const args = process.argv.slice(2);

  const file = args[0];

  if (!file) {
    console.error(`no file provided`);
    process.exit(1);
  } else {
    func(file);
  }
}
