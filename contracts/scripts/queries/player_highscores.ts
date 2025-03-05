import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import 'dotenv/config';
import {getTHEGRAPH} from './utils';
import {SpaceInfo} from 'conquest-eth-common';
import {BigNumber} from 'ethers';
import {formatEther} from '@ethersproject/units';

type Highscore = {
  id: string;
  points: number;
  pool_score: number;
  fixed_score: number;
};

type QueryOwner = {
  id: string;
  currentStake: string;
  tokenToWithdraw: string;
  playTokenBalance: string;

  points: string;
  points_fixed_lastTime: string;
  points_fixed_toWithdraw: string;
  points_shared_rewardsToWithdraw: string;
  points_shared_totalRewardPerPointAccounted: string;
};

type GlobalPoints = {
  lastUpdateTime: string;
  totalRewardPerPointAtLastUpdate: string;
  totalPoints: string;
};

type GlobalPointsBN = {
  lastUpdateTime: BigNumber;
  totalRewardPerPointAtLastUpdate: BigNumber;
  totalPoints: BigNumber;
};

type QueryResult = {
  owners: QueryOwner[];
  points: GlobalPoints;
};

type Highscores = Highscore[];

const DECIMALS_18 = BigNumber.from('1000000000000000000');

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments} = hre;
  const theGraph = await getTHEGRAPH(hre);
  const OuterSpace = await deployments.get('OuterSpace');
  const RewardsGenerator = await deployments.get('RewardsGenerator');

  const queryString = `
query($first: Int! $lastId: ID! ) {
  owners( block: {number: 38876207} first: $first where: {
    totalStaked_gt: 0
    id_gt: $lastId
  }) {
    id
    currentStake
    tokenToWithdraw
    playTokenBalance

    points
    points_fixed_lastTime
    points_fixed_toWithdraw
    points_shared_rewardsToWithdraw
    points_shared_totalRewardPerPointAccounted
  }

  points (id: "Points") {
    lastUpdateTime
    totalRewardPerPointAtLastUpdate
    totalPoints
  }
}
`;

  const FIXED_REWARD_RATE_thousands_millionth = BigNumber.from(
    RewardsGenerator.linkedData.fixedRewardRateThousandsMillionth
  );
  const REWARD_RATE_millionth = BigNumber.from(RewardsGenerator.linkedData.rewardRateMillionth);
  const PRECISION: BigNumber = BigNumber.from('1000000000000000000000000');
  let DECIMALS_18_MILLIONTH: BigNumber = BigNumber.from('1000000000000');

  type PerAccount = {
    points: BigNumber;
    points_fixed_lastTime: BigNumber;
    points_fixed_toWithdraw: BigNumber;
    points_shared_rewardsToWithdraw: BigNumber;
    points_shared_totalRewardPerPointAccounted: BigNumber;
  };

  function earnedFromFixedRate(time: number, account: PerAccount): BigNumber {
    // console.log({time});
    const extraFixed = BigNumber.from(time)
      .sub(account.points_fixed_lastTime)
      .mul(account.points.mul(FIXED_REWARD_RATE_thousands_millionth))
      .div('1000000000');
    return extraFixed.add(account.points_fixed_toWithdraw);
  }

  function _computeRewardsEarned(
    totalRewardPerPointAccountedSoFar: BigNumber,
    accountPoints: BigNumber,
    currentTotalRewardPerPoint: BigNumber,
    accountRewardsSoFar: BigNumber
  ): BigNumber {
    return accountRewardsSoFar.add(
      accountPoints
        .mul(currentTotalRewardPerPoint.sub(totalRewardPerPointAccountedSoFar))
        .mul(DECIMALS_18_MILLIONTH)
        .div(PRECISION)
    );
  }
  function _computeExtraTotalRewardPerPointSinceLastTime(
    totalPoints: BigNumber,
    rewardRateMillionth: BigNumber,
    lastUpdateTime: BigNumber,
    time: BigNumber
  ): BigNumber {
    if (totalPoints.eq(0)) {
      return totalPoints;
    }
    return time.sub(lastUpdateTime).mul(rewardRateMillionth.mul(PRECISION)).div(totalPoints);
  }
  function _updateGlobal(g: GlobalPoints, time: BigNumber): GlobalPointsBN {
    const _global = {
      lastUpdateTime: BigNumber.from(g.lastUpdateTime),
      totalRewardPerPointAtLastUpdate: BigNumber.from(g.totalRewardPerPointAtLastUpdate),
      totalPoints: BigNumber.from(g.totalPoints),
    };
    const totalPointsSoFar = _global.totalPoints;

    const extraTotalRewardPerPoint = _computeExtraTotalRewardPerPointSinceLastTime(
      totalPointsSoFar,
      REWARD_RATE_millionth,
      _global.lastUpdateTime,
      time
    );

    const totalRewardPerPointAllocatedSoFar = _global.totalRewardPerPointAtLastUpdate.add(extraTotalRewardPerPoint);

    _global.totalRewardPerPointAtLastUpdate = totalRewardPerPointAllocatedSoFar;
    _global.lastUpdateTime = time;

    return _global;
  }

  const highscoreQueryResult: QueryResult | undefined = await theGraph.complexQuery<QueryResult>(queryString, {
    variables: {},
    list: {
      path: 'owners',
    },
  });

  const data = {data: highscoreQueryResult};

  if (data.data) {
    const time = 1741168800;
    let highscores: Highscores = [];

    const globalData = data.data.points;
    highscores = data.data.owners

      .map((p) => {
        // TODO fix this , also in RewardsGenerator.sol
        let lastTime = BigNumber.from(p.points_fixed_lastTime);
        if (lastTime.lt(1739550865)) {
          lastTime = BigNumber.from(1739550865);
        }
        const points = BigNumber.from(p.points);
        // broken because fixed_lastTime
        const points_fixed_lastTime = lastTime; // ;
        const points_fixed_toWithdraw = BigNumber.from(p.points_fixed_toWithdraw);
        const points_shared_rewardsToWithdraw = BigNumber.from(p.points_shared_rewardsToWithdraw);
        const points_shared_totalRewardPerPointAccounted = BigNumber.from(p.points_shared_totalRewardPerPointAccounted);
        const account = {
          points,
          points_fixed_lastTime,
          points_fixed_toWithdraw,
          points_shared_rewardsToWithdraw,
          points_shared_totalRewardPerPointAccounted,
        };
        // if (
        //   p.id === '0xd0f46a5d48596409264d4efc1f3b229878fff743' ||
        //   p.id == '0xd191fcf07d18d9d22d44ce0bccb926a3a98ad212' ||
        //   p.id == '0xed684079af754343484a7cd29db21d3a6d1dbdf7'
        // ) {
        //   console.log('------------------------------------------------------');
        //   console.log(p.id);
        //   console.log({
        //     points_fixed_lastTime: points_fixed_lastTime.toString(),
        //     points_fixed_toWithdraw: points_fixed_toWithdraw.toString(),
        //     lastTime: lastTime.toNumber(),
        //   });
        //   console.log('------------------------------------------------------');
        // }

        const accountPointsSoFar = points;

        const {totalRewardPerPointAtLastUpdate} = _updateGlobal(globalData, BigNumber.from(time));
        const pool_amount = _computeRewardsEarned(
          account.points_shared_totalRewardPerPointAccounted,
          accountPointsSoFar,
          totalRewardPerPointAtLastUpdate,
          account.points_shared_rewardsToWithdraw
        );

        const fixed_amount = earnedFromFixedRate(time, account);

        return {
          id: p.id,
          points: points.mul(1000000).div(DECIMALS_18).toNumber() / 1000000,
          fixed_score: fixed_amount.mul(1000000).div(DECIMALS_18).toNumber() / 1000000,
          pool_score: pool_amount.mul(1000000).div(DECIMALS_18).toNumber() / 1000000,
          account,
          globalData,
        };
      })
      .sort((a, b) => b.fixed_score - a.fixed_score);

    const scores: {address: string; score: number}[] = highscores.map((v) => ({
      address: v.id,
      score: Math.floor(Number(v.fixed_score.toString()) * 100000),
    }));

    // Total reward amount in USD
    const TOTAL_REWARD_USD = BigNumber.from('1000000000000000000000');

    // Calculate the total score from all players
    const totalScore = scores.reduce((sum, player) => sum + player.score, 0);
    const rewards = scores.map((player) => {
      const rewardAmount = TOTAL_REWARD_USD.mul(BigNumber.from(player.score).mul(1000000)).div(
        BigNumber.from(totalScore).mul(1000000)
      );
      return {
        address: player.address,
        score: player.score,
        reward: rewardAmount.toString(),
        rewardFormated: formatEther(rewardAmount),
        percentage: (player.score / totalScore) * 100,
      };
    });
    deployments.saveDotFile('.highscore_rewards.json', JSON.stringify(rewards, null, 2));
  }
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
