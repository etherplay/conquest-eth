import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {parseEther} from '@ethersproject/units';
import {BigNumber} from '@ethersproject/bignumber';

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {claimKeyDistributor} = await hre.getNamedAccounts();
  const {execute} = hre.deployments;

  const recipients: {address: string; tokenUnitGivenSoFar: number}[] = JSON.parse(
    await hre.deployments.readDotFile('.airdrop.json')
  );

  const amounts: BigNumber[] = [];
  const addresses: string[] = [];

  const targetAmount = BigNumber.from(500).mul('1000000000000000000');

  for (const recipient of recipients) {
    const tokenGiven = BigNumber.from(recipient.tokenUnitGivenSoFar).mul('1000000000000000000');
    const tokenToGive = targetAmount.sub(tokenGiven);
    if (tokenToGive.gt(0)) {
      amounts.push(tokenToGive);
      addresses.push(recipient.address);
    } else if (tokenToGive.lt(0)) {
      console.error(`${recipient.address} has been given too much`);
    }
  }
  const etherAmount = BigNumber.from(addresses.length).mul(parseEther('0.2'));

  console.log({
    // amounts: amounts.map((v) => v.toString()),
    // addresses,
    numPlayers: amounts.length,
    etherAmount: etherAmount.toString(),
    tokenAmountInTotal: amounts
      .reduce((prev, curr) => prev.add(curr), BigNumber.from(0))
      .div('1000000000000000000')
      .toString(),
  });
  await execute(
    'ConquestToken',
    {from: claimKeyDistributor, value: etherAmount, log: true, autoMine: true},
    'distributeVariousAmountsAlongWithETH',
    addresses,
    amounts
  );
}
if (require.main === module) {
  func(hre);
}
