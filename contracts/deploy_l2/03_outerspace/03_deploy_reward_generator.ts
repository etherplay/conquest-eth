import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {formatEther, parseEther} from '@ethersproject/units';

import {increaseTime} from '../../test/test-utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer, player} = await hre.getNamedAccounts();
  const {deploy, read, execute, rawTx} = hre.deployments;

  const ConquestCredits = await hre.deployments.get('ConquestCredits');
  const OuterSpace = await hre.deployments.get('OuterSpace');
  const gamesToEnable = [OuterSpace.address];
  console.log(`games to enable : ${gamesToEnable}`);

  const accountsToInitialise: {account: `0x${string}`; amount: string}[] = [
    {account: `0x8888888884d2e4E981023dA51B43066461F46Dca`, amount: '2600000000000000000'},
    {account: `0x1ffb5056730672AB48597Ce24371Feb0eC88a2b8`, amount: '2900000000000000000'},
    {account: `0x7fCe02BB66c0D9396fb9bC60a80d45462E60fdfF`, amount: '6200000000000000000'},
    {account: `0x283aFaad5c345680144f20F3910EA95e5F0bA932`, amount: '14800000000000000000'},
  ];

  const RewardsGenerator = await deploy('RewardsGenerator', {
    from: deployer,
    proxy: hre.network.name !== 'mainnet' ? 'postUpgrade' : undefined,
    args: [
      ConquestCredits.address,
      {
        rewardRateMillionth: 100, // 100 for every million of second. or 8.64 / day
        fixedRewardRateThousandsMillionth: 10, // 10 for every  thousand million of seconds, or 0.000864 per day per stake or 315.36 / year / 1000 stake
      },
      gamesToEnable,
      accountsToInitialise,
    ],
    log: true,
    autoMine: true,
  });

  const currentGeneratorAdmin = await read('OuterSpace', 'generatorAdmin');
  if (currentGeneratorAdmin.toLowerCase() !== deployer.toLowerCase()) {
    await execute('OuterSpace', {from: deployer, log: true}, 'setGeneratorAdmin', deployer);
  }

  const currentGenerator = await read('OuterSpace', 'generator');
  if (currentGenerator.toLowerCase() !== RewardsGenerator.address.toLowerCase()) {
    await execute('OuterSpace', {from: deployer, log: true}, 'setGenerator', RewardsGenerator.address);
  }

  const isGeneratorAllowedToMint = await read('ConquestCredits', 'generators', RewardsGenerator.address);
  if (!isGeneratorAllowedToMint) {
    await execute('ConquestCredits', {from: deployer, log: true}, 'setGenerator', RewardsGenerator.address, true);
  }

  // const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  // const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  // console.log({shared, self});

  // console.log("========================================================");
  // console.log("========================================================");
  // console.log("========================================================");
  // console.log("========================================================");
  // console.log("========================================================");

  // await increaseTime(24 * 3600);

  // console.log(`============       24 hours Later..       =========================`);

  // await rawTx({from: deployer, log: true, to: player, value: parseEther('1')});

  // {
  //   const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  //   const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  //   console.log({shared, self});
  // }

  // await increaseTime(24 * 3600);

  // console.log(`============       24 hours Later..       =========================`);

  // {
  //   const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  //   const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  //   console.log({shared, self});
  // }

  // await increaseTime(365 * 24 * 3600);

  // console.log(`============       1 year Later..       =========================`);

  // {
  //   const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  //   const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  //   console.log({shared, self});
  // }

  // await increaseTime(100 * 365 * 24 * 3600);

  // console.log(`============       100 years Later..       =========================`);

  // {
  //   const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  //   const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  //   console.log({shared, self});
  // }

  // await increaseTime(20000 * 365 * 24 * 3600);

  // console.log(`============       20,000 years Later..       =========================`);

  // {
  //   const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  //   const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  //   console.log({shared, self});
  // }

  // await execute('RewardsGenerator', {from: player, log: true}, 'claimSharedPoolRewards', player);
  // {
  //   const balance = formatEther(await read('ConquestCredits', 'balanceOf', player));

  //   console.log({balance});
  // }

  // await execute('RewardsGenerator', {from: player, log: true},'claimFixedRewards', player);
  // {
  //   const balance = formatEther(await read('ConquestCredits', 'balanceOf', player));

  //   console.log({balance});
  // }

  // {
  //   const shared = formatEther(await read('RewardsGenerator', 'earnedFromPoolRate', player));
  //   const self = formatEther(await read('RewardsGenerator', 'earnedFromFixedRate', player));

  //   console.log({shared, self});
  // }
};
export default func;
func.tags = ['RewardsGenerator', 'RewardsGenerator_deploy'];
func.dependencies = ['ConquestCredits_deploy', 'OuterSpace_deploy'];
