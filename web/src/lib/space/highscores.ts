import {BaseStoreWithData} from '$lib/utils/stores/base';
import {blockTime, finality, logPeriod, lowFrequencyFetch} from '$lib/config';
import {SUBGRAPH_ENDPOINT} from '$lib/blockchain/subgraph';
import {BigNumber} from '@ethersproject/bignumber';

type Highscore = {
  id: string;
  total: number;
  score: number;
  currentStake: number;
  tokenToWithdraw: number;
  tokenBalance: number;
  tokenGiven: number;
};

export type Highscores = {
  step: 'IDLE' | 'LOADING' | 'READY';
  data?: Highscore[];
  error?: string;
};

type QueryOwner = {
  id: string;
  currentStake: string;
  tokenToWithdraw: string;
  playTokenBalance: string;
};

const DECIMALS_18 = BigNumber.from('1000000000000000000');

class HighscoresStore extends BaseStoreWithData<Highscores, Highscore[]> {
  private timeout: NodeJS.Timeout;
  public constructor() {
    super({
      step: 'IDLE',
    });
  }
  // introducer_not: "0x9a3b0d0b08fb71f1a5e0f248ad3a42c341f7837c"
  // tokenGiven_lt: "2000000000000000000000"
  async fetch() {
    //     const query = `
    // query($first: Int! $lastId: ID!) {
    //   owners(first: $first block: {number: 6074693} where: {
    //     totalStaked_gt: 0
    //     tokenGiven_gt: 0
    //     id_gt: $lastId
    //     id_not_in: ["0x61c461ecc993aadeb7e4b47e96d1b8cc37314b20", "0xe53cd71271acadbeb0f64d9c8c62bbddc8ca9e66"]
    //   }) {
    //     id
    //     currentStake
    //     tokenToWithdraw
    //     tokenBalance
    //     tokenGiven
    //   }
    // }
    // `;
    // id_not_in: ["0x61c461ecc993aadeb7e4b47e96d1b8cc37314b20", "0xe53cd71271acadbeb0f64d9c8c62bbddc8ca9e66"]
    const query = `
query($first: Int! $lastId: ID!) {
  owners(first: $first block: {number: 21538868} where: {
    totalStaked_gt: 0
    tokenGiven_gt: 0
    id_gt: $lastId
  }) {
    id
    currentStake
    tokenToWithdraw
    tokenBalance
    tokenGiven
  }
}
`;

    try {
      let highscoreQueryResult: QueryOwner[];
      try {
        highscoreQueryResult = await SUBGRAPH_ENDPOINT.queryList<QueryOwner>(query, {
          path: 'owners',
          context: {
            requestPolicy: 'network-only', // required as cache-first will not try to get new data
          },
        });
      } catch (e) {
        console.error(e);
        this.setPartial({error: `cannot fetch from thegraph node`});
        throw new Error(`cannot fetch from thegraph node`);
      }
      const highscores = highscoreQueryResult
        .map((p) => {
          const currentStake = BigNumber.from(p.currentStake);
          const tokenToWithdraw = BigNumber.from(p.tokenToWithdraw);
          const tokenBalance = BigNumber.from(p.tokenBalance);
          const tokenGiven = BigNumber.from(p.tokenGiven);
          const total = currentStake.add(tokenToWithdraw).add(tokenBalance);
          return {
            id: p.id,
            total: total.div(DECIMALS_18).toNumber(),
            score: total.sub(tokenGiven).mul(1000000).div(tokenGiven).add(1000000).toNumber(),
            currentStake: currentStake.div(DECIMALS_18).toNumber(),
            tokenToWithdraw: tokenToWithdraw.div(DECIMALS_18).toNumber(),
            tokenBalance: tokenBalance.div(DECIMALS_18).toNumber(),
            tokenGiven: tokenGiven.div(DECIMALS_18).toNumber(),
          };
        })
        .sort((a, b) => b.score - a.score);

      this.setPartial({step: 'READY', data: highscores}); //.slice(0, 18)});
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

export const highscores = new HighscoresStore();
