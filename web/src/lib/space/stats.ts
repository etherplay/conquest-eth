import {BaseStoreWithData} from '$lib/utils/stores/base';
import {lowFrequencyFetch} from '$lib/config';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import {BigNumber} from '@ethersproject/bignumber';

type StatsData = {
  totalStaked: BigNumber;
  currentStake: BigNumber;
  currentStakeMinusExiting: BigNumber;
  numPlanetsStaked: number;
  numPlanetsStakedMinusExiting: number;
  numPlanetsStakedOnce: number;
  numFleetsLaunched: number;
  numFleetsResolved: number;
  numPlanetsWithExit: number;
  numPlanetsExitFinalized: number;
};

type StatsQuey = {
  space: {
    totalStaked: string;
    currentStake: string;
    currentStakeMinusExiting: string;
    numPlanetsStaked: string;
    numPlanetsStakedMinusExiting: string;
    numPlanetsStakedOnce: string;
    numFleetsLaunched: string;
    numFleetsResolved: string;
    numPlanetsWithExit: string;
    numPlanetsExitFinalized: string;
  };
};

export type Stats = {
  step: 'IDLE' | 'LOADING' | 'READY';
  data?: StatsData;
  error?: string;
};

class StatsStore extends BaseStoreWithData<Stats, StatsData> {
  private timeout: NodeJS.Timeout;
  public constructor() {
    super({
      step: 'IDLE',
    });
  }
  async fetch() {
    const query = `
query {
    space(id: "Space") {
      totalStaked
      currentStake
      currentStakeMinusExiting
      numPlanetsStaked
      numPlanetsStakedMinusExiting
      numPlanetsStakedOnce
      numFleetsLaunched
      numFleetsResolved
      numPlanetsWithExit
      numPlanetsExitFinalized

    }
}
`;

    try {
      let statsQueryResult: StatsQuey;
      try {
        const response = await SUBGRAPH_ENDPOINT.query<StatsQuey>(query, {
          context: {
            requestPolicy: 'network-only', // required as cache-first will not try to get new data
          },
        });
        if (response.error) {
          throw response.error;
        }
        statsQueryResult = response.data;
      } catch (e) {
        console.error(e);
        this.setPartial({error: `cannot fetch from thegraph node`});
        throw new Error(`cannot fetch from thegraph node`);
      }
      const statsData = {
        totalStaked: BigNumber.from(statsQueryResult.space.totalStaked),
        currentStake: BigNumber.from(statsQueryResult.space.currentStake),
        currentStakeMinusExiting: BigNumber.from(statsQueryResult.space.currentStakeMinusExiting),
        numPlanetsStaked: parseInt(statsQueryResult.space.numPlanetsStaked),
        numPlanetsStakedMinusExiting: parseInt(statsQueryResult.space.numPlanetsStakedMinusExiting),
        numPlanetsStakedOnce: parseInt(statsQueryResult.space.numPlanetsStakedOnce),
        numFleetsLaunched: parseInt(statsQueryResult.space.numFleetsLaunched),
        numFleetsResolved: parseInt(statsQueryResult.space.numFleetsResolved),
        numPlanetsWithExit: parseInt(statsQueryResult.space.numPlanetsWithExit),
        numPlanetsExitFinalized: parseInt(statsQueryResult.space.numPlanetsExitFinalized),
      };

      this.setPartial({step: 'READY', data: statsData}); //.slice(0, 18)});
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

export const stats = new StatsStore();
