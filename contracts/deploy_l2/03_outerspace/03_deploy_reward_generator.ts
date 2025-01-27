import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {formatEther, parseEther} from '@ethersproject/units';

import {increaseTime} from '../../test/test-utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const networkName = await hre.deployments.getNetworkName();
  const {deployer, player} = await hre.getNamedAccounts();
  const {deploy, read, execute, rawTx, getOrNull} = hre.deployments;

  const ConquestCredits = await hre.deployments.get('ConquestCredits');
  const OuterSpace = await hre.deployments.get('OuterSpace');
  const gamesToEnable = [OuterSpace.address];

  const accountsToInitialise: {account: `0x${string}`; amount: string}[] = [];

  // Disabled first
  let rewardRateMillionth = 0;
  let fixedRewardRateThousandsMillionth = 0;

  if (networkName === 'localhost') {
    // will be upgraded with these parameters:
    // rewardRateMillionth = 100; // 100 for every million of second. or 8.64 / day
    // fixedRewardRateThousandsMillionth = 10; // 10 for every  thousand million of seconds, or 0.000864 per day per stake or 315.36 / year / 1000 stake
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const ExistingRewardsGenerator = await getOrNull('RewardsGenerator');
  if (ExistingRewardsGenerator) {
    const existing_rewardRateMillionth = await read('RewardsGenerator', 'REWARD_RATE_millionth');
    const existing_fixedRewardRateThousandsMillionth = await read(
      'RewardsGenerator',
      'FIXED_REWARD_RATE_thousands_millionth'
    );

    if (
      !existing_fixedRewardRateThousandsMillionth.eq(fixedRewardRateThousandsMillionth) ||
      !existing_rewardRateMillionth.eq(rewardRateMillionth)
    ) {
      if (existing_fixedRewardRateThousandsMillionth.eq(0) && existing_rewardRateMillionth.eq(0)) {
        console.log(`RewardsGenerator parameters changed, updating`);
        const lastUpdate = await read('RewardsGenerator', 'lastUpdated');
        if (timestamp - lastUpdate > 1 * 60) {
          await execute('RewardsGenerator', {from: deployer, log: true}, 'update');
        }
      } else {
        console.log(`do not update as it is non-zero`);
      }
    }
  }

  const RewardsGenerator = await deploy('RewardsGenerator', {
    from: deployer,
    proxy: hre.network.name !== 'mainnet' ? 'postUpgrade' : undefined,
    args: [
      ConquestCredits.address,
      {
        rewardRateMillionth,
        fixedRewardRateThousandsMillionth,
      },
      gamesToEnable,
      accountsToInitialise,
    ],
    linkedData: {
      rewardRateMillionth,
      fixedRewardRateThousandsMillionth,
    },
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

  // we do not allow claim yet
  // const isGeneratorAllowedToMint = await read('ConquestCredits', 'generators', RewardsGenerator.address);
  // if (!isGeneratorAllowedToMint) {
  //   await execute('ConquestCredits', {from: deployer, log: true}, 'setGenerator', RewardsGenerator.address, true);
  // }

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
