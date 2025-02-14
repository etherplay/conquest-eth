import {BaseStoreWithData} from '$lib/utils/stores/base';
import {blockTime, finality, logPeriod, lowFrequencyFetch} from '$lib/config';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import {BigNumber} from '@ethersproject/bignumber';
import {derived, type Readable} from 'svelte/store';
import {time} from '$lib/time';
import {initialContractsInfos} from '$lib/blockchain/contracts';

type Highscore = {
  id: string;
  points: number;
  pool_score: number;
  fixed_score: number;
};

export type HighscoresData = {
  step: 'IDLE' | 'LOADING' | 'READY';
  data?: QueryResult;
  error?: string;
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

class HighscoresStore extends BaseStoreWithData<HighscoresData, QueryResult> {
  private timeout: NodeJS.Timeout;
  public constructor() {
    super({
      step: 'IDLE',
    });
  }
  async fetch() {
    const query = `
query($first: Int! $lastId: ID!) {
  owners(first: $first where: {
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

    try {
      let highscoreQueryResult: QueryResult;
      try {
        highscoreQueryResult = await SUBGRAPH_ENDPOINT.queryListWithData<QueryResult>(query, 'owners', {
          context: {
            requestPolicy: 'network-only', // required as cache-first will not try to get new data
          },
        });
      } catch (e) {
        console.error(e);
        this.setPartial({error: `cannot fetch from thegraph node`});
        throw new Error(`cannot fetch from thegraph node`);
      }

      this.setPartial({step: 'READY', data: highscoreQueryResult}); //.slice(0, 18)});
    } catch (e) {
      console.error(e);
    }

    this.timeout = setTimeout(this.fetch.bind(this), lowFrequencyFetch * 1000);
  }

  start() {
    if (this.$store.step === 'IDLE') {
      this.setPartial({step: 'LOADING'});
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(this.fetch.bind(this), 1000);
  }

  stop() {
    this.setPartial({step: 'IDLE'});
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}

export const highscoresData = new HighscoresStore();

const FIXED_REWARD_RATE_thousands_millionth = BigNumber.from(
  initialContractsInfos.contracts.RewardsGenerator.linkedData.fixedRewardRateThousandsMillionth
);
const REWARD_RATE_millionth = BigNumber.from(
  initialContractsInfos.contracts.RewardsGenerator.linkedData.fixedRewardRateThousandsMillionth
);
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
  console.log({time});
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

export const highscores: Readable<{step: 'IDLE' | 'LOADING' | 'READY'; data?: Highscores; error?: string}> = derived(
  [highscoresData, time],
  ([data, time]) => {
    let highscores: Highscores = [];
    if (data.data) {
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
          const points_shared_totalRewardPerPointAccounted = BigNumber.from(
            p.points_shared_totalRewardPerPointAccounted
          );
          const account = {
            points,
            points_fixed_lastTime,
            points_fixed_toWithdraw,
            points_shared_rewardsToWithdraw,
            points_shared_totalRewardPerPointAccounted,
          };

          console.log(account);

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
    }

    return {
      step: data.step,
      error: data.error,
      data: highscores,
    };
  }
);
