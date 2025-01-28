import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre, {ethers} from 'hardhat';
import {parseEther} from '@ethersproject/units';
import {BigNumber} from '@ethersproject/bignumber';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {claimKeyDistributor} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;

  const recipients: {address: string; numTokens: number}[] = JSON.parse(
    await hre.deployments.readDotFile('.winners.json')
  );

  const etherAmounts: BigNumber[] = [];
  const tokenAmounts: BigNumber[] = [];
  const addresses: string[] = [];

  for (const recipient of recipients) {
    const reward = BigNumber.from(recipient.numTokens).mul('1000000000000000000');
    addresses.push(recipient.address);
    tokenAmounts.push(BigNumber.from(0));
    etherAmounts.push(reward);
  }
  const etherAmount = etherAmounts.reduce((prev, curr) => prev.add(curr), BigNumber.from(0));

  console.log({
    // amounts: amounts.map((v) => v.toString()),
    // addresses,
    numPlayers: etherAmounts.length,
    etherAmount: etherAmount.div('1000000000000000000').toString(),
    etherAmountsInTotal: etherAmounts
      .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))
      .div('1000000000000000000')
      .toString(),
    rewards: etherAmounts.map((v) => v.div('1000000000000000000').toString()),
    players: addresses,
  });
  const balanceBefore = await ethers.provider.getBalance(claimKeyDistributor);

  const balancesBefore = [];
  for (const address of addresses) {
    balancesBefore.push(await ethers.provider.getBalance(address));
  }

  await execute(
    'ConquestToken',
    {from: claimKeyDistributor, value: etherAmount, log: true, autoMine: true},
    'distributeVariousAmountsOfTokenAndETH',
    addresses,
    tokenAmounts,
    etherAmounts
  );
  const balanceAfter = await ethers.provider.getBalance(claimKeyDistributor);

  const balancesAfter = [];
  for (const address of addresses) {
    balancesAfter.push(await ethers.provider.getBalance(address));
  }

  console.log({
    balanceBefore: balanceBefore.div('1000000000000000000').toString(),
    balanceAfter: balanceAfter.div('1000000000000000000').toString(),
  });

  console.log({
    balancesBefore: balancesBefore.map((v) => v.div('1000000000000000000').toString()),
    balancesAfter: balancesAfter.map((v) => v.div('1000000000000000000').toString()),
  });
}
if (require.main === module) {
  func(hre);
}
