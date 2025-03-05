import {formatEther} from '@ethersproject/units';
import {BigNumber} from 'ethers';
import hre, {ethers} from 'hardhat';

async function func(): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute} = deployments;

  const {deployer} = await getNamedAccounts();

  const yakuza_contributors_str = await deployments.readDotFile('.yakuza_contributors.json');
  const yakuza_contributors: {
    id: string;
    yakuzaSubscription: {
      totalContribution: string;
    };
  }[] = JSON.parse(yakuza_contributors_str);

  const REWARDS_TO_DISTRIBUTE = BigNumber.from('38065431488101105113');
  const rewards: {address: string; reward: BigNumber}[] = [];

  const totalContributions = yakuza_contributors.reduce(
    (sum, contributor) => sum.add(BigNumber.from(contributor.yakuzaSubscription.totalContribution)),
    BigNumber.from(0)
  );

  // Calculate and assign rewards proportionally based on contribution
  for (const contributor of yakuza_contributors) {
    const contributionAmount = BigNumber.from(contributor.yakuzaSubscription.totalContribution);

    // Skip if no contribution
    if (contributionAmount.isZero()) continue;

    // Calculate reward: (individual contribution / total contributions) * total rewards
    const reward = contributionAmount.mul(REWARDS_TO_DISTRIBUTE).div(totalContributions);

    rewards.push({
      address: contributor.id,
      reward: reward,
    });
  }

  // Sort rewards array by reward amount in descending order
  rewards.sort((a, b) => {
    // For BigNumber comparison, we need to use the BigNumber methods
    if (a.reward.gt(b.reward)) return -1;
    if (a.reward.lt(b.reward)) return 1;
    return 0;
  });

  const addresses: string[] = [];
  const tokenAmounts: BigNumber[] = [];
  const nativeTokemAmounts: BigNumber[] = [];
  let totalValue = BigNumber.from(0);

  for (const reward of rewards) {
    addresses.push(reward.address);
    tokenAmounts.push(BigNumber.from(0));
    nativeTokemAmounts.push(BigNumber.from(reward.reward));
    totalValue = totalValue.add(BigNumber.from(reward.reward));
  }

  console.log({
    totalValue: formatEther(totalValue),
  });

  console.log({
    first: addresses[0],
  });
  const balance = await ethers.provider.getBalance(addresses[0]);
  console.log({
    balance: formatEther(balance),
  });

  await execute(
    'PlayToken',
    {
      from: deployer,
      log: true,
      autoMine: true,
      value: totalValue,
    },
    'distributeVariousAmountsOfTokenAndETH',
    addresses,
    tokenAmounts,
    nativeTokemAmounts
  );

  const balanceAfter = await ethers.provider.getBalance(addresses[0]);
  console.log({
    balanceAfter: formatEther(balanceAfter),
  });
}
if (require.main === module) {
  func();
}
