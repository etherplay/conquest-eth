import {wallet, chain} from '../../blockchain/wallet';
// import type {BigNumber} from '@ethersproject/bignumber';
import type {ChainStore, WalletStore} from 'web3w';
import {BaseStore} from '$lib/utils/stores/base';
import {Wallet} from '@ethersproject/wallet';
import {rebuildLocationHash} from '$lib/utils/web';
import {hashParams} from '$lib/config';
import {BigNumber} from '@ethersproject/bignumber';
import {formatError} from '$lib/utils';
import {JsonRpcProvider} from '@ethersproject/providers';

type TokenClaim = {
  inUrl: boolean;
  state:
    | 'Loading'
    | 'Available'
    | 'SettingUpClaim'
    | 'Claiming'
    | 'Claimed'
    | 'AlreadyClaimed'
    | 'AlreadyClaimedAnother';
  error?: unknown;
  txHash?: string;
};

class TokenClaimStore extends BaseStore<TokenClaim> {
  constructor(private wallet: WalletStore, private chain: ChainStore) {
    super({
      inUrl: !!hashParams.tokenClaim,
      state: 'Loading',
    });

    this.wallet.subscribe(() => {
      this.onConnection();
    });

    this.chain.subscribe(() => {
      this.onConnection();
    });
  }

  onConnection() {
    if (wallet.chain && wallet.chain.state === 'Ready') {
      this.check();
    }
  }

  acknowledgeError() {
    this.setPartial({error: undefined});
  }

  getClaimtWallet(): Wallet {
    return new Wallet(hashParams.tokenClaim);
  }

  clearURL(): void {
    delete hashParams.tokenClaim;
    rebuildLocationHash(hashParams);
    this.setPartial({inUrl: false});
  }

  async check() {
    if (!this.$store.inUrl) {
      return;
    }
    if (!wallet.provider) {
      throw new Error(`no wallet.provider`);
    }
    if (!wallet.chain.contracts) {
      throw new Error(`no wallet.chain.contracts`);
    }
    let claimWallet;
    try {
      claimWallet = this.getClaimtWallet();
    } catch (e) {
      this.setPartial({error: formatError(e)});
      return;
    }

    const FreePlayToken = wallet.chain.contracts.FreePlayToken;
    const balance = await FreePlayToken.balanceOf(claimWallet.address);

    if (balance.eq(0)) {
      this.setPartial({state: 'AlreadyClaimed'});
    } else {
      this.setPartial({state: 'Available'});
    }
  }

  async claim() {
    if (!wallet.provider) {
      throw new Error(`no wallet.provider`);
    }
    if (!wallet.chain.contracts) {
      throw new Error(`no wallet.chain.contracts`);
    }

    this.setPartial({state: 'SettingUpClaim'});

    const claimWallet = this.getClaimtWallet().connect(wallet.provider);

    const FreePlayToken = wallet.chain.contracts.FreePlayToken.connect(claimWallet);

    let ethBalance: BigNumber;
    let tokenBalance: BigNumber;
    let nonce: number;
    let estimate: BigNumber;
    try {
      ethBalance = await wallet.provider.getBalance(claimWallet.address);
      tokenBalance = await FreePlayToken.balanceOf(claimWallet.address);
      if (tokenBalance.eq(0)) {
        // TODO
      }

      nonce = await wallet.provider.getTransactionCount(claimWallet.address, 'latest');

      estimate = await FreePlayToken.estimateGas.transferAlongWithETH(wallet.address, tokenBalance, {
        value: 1,
        nonce,
      });
    } catch (e) {
      // TODO use previous state instead of 'Available'
      this.setPartial({state: 'Available', error: formatError(e)});
    }

    if (wallet.selected?.toLowerCase() === 'portis') {
      console.log('PORTIS bug, use alternative provider');

      let provider = wallet.fallbackProvider;
      if (!provider) {
        // TODO do not default on localhost
        let url = 'http://127.0.0.1:8545';
        const chainId = wallet.chain.chainId;
        if (chainId === '1') {
          url = 'https://mainnet.infura.io/v3/bc0bdd4eaac640278cdebc3aa91fabe4';
        } else if (chainId === '5') {
          url = 'https://goerli.infura.io/v3/bc0bdd4eaac640278cdebc3aa91fabe4';
        } else if (chainId === '4') {
          url = 'https://rinkeby.infura.io/v3/bc0bdd4eaac640278cdebc3aa91fabe4';
        } else if (chainId === '100') {
          url = 'https://rpc.gnosischain.com/';
        }
        provider = new JsonRpcProvider(url);
      }
      const claimWallet_forPortisBug = this.getClaimtWallet().connect(provider);
      const FreePlayToken_forPortisBug = wallet.chain.contracts.FreePlayToken.connect(claimWallet_forPortisBug);

      const gasPrice = (await wallet.provider.getGasPrice()).mul(2); // TODO ?

      const ethLeft = ethBalance.sub(estimate.mul(gasPrice));
      console.log({ethLeft: ethLeft.toString()});

      let tx;
      try {
        tx = await FreePlayToken_forPortisBug.transferAlongWithETH(wallet.address, tokenBalance, {
          value: ethLeft.toString(),
          nonce,
          gasPrice,
        });
        this.setPartial({state: 'Claiming'});
      } catch (e) {
        // TODO use previous state instead of 'Available'
        this.setPartial({state: 'Available', error: formatError(e)});
        console.error(e);
      }
      if (tx) {
        this.setPartial({txHash: tx.hash});
        try {
          await tx.wait();
          this.setPartial({state: 'Claimed'});
        } catch (e) {
          // TODO use previous state instead of 'Available'
          this.setPartial({state: 'Available', error: formatError(e)});
          console.error(e);
        }
      }
    } else {
      const gwei = BigNumber.from('1000000000');
      const maxPriorityFeeToUSe = gwei.mul(5);
      const maxGasPriceToUse = ethBalance.div(8).div(100000);

      const gasPrice = maxGasPriceToUse.gte(maxPriorityFeeToUSe) ? maxGasPriceToUse : maxPriorityFeeToUSe; //gwei.mul(500); //await wallet.provider.getGasPrice();

      const ethLeft = ethBalance.sub(estimate.mul(gasPrice));
      console.log({ethLeft: ethLeft.toString()});

      let tx;
      try {
        tx = await FreePlayToken.transferAlongWithETH(wallet.address, tokenBalance, {
          value: ethLeft.toString(),
          nonce,
          maxFeePerGas: gasPrice, // TODO won't sweep it all
          maxPriorityFeePerGas: maxPriorityFeeToUSe,
        });
        this.setPartial({state: 'Claiming'});
      } catch (e) {
        // TODO use previous state instead of 'Available'
        this.setPartial({state: 'Available', error: formatError(e)});
        console.error(e);
      }
      if (tx) {
        this.setPartial({txHash: tx.hash});
        try {
          await tx.wait();
          this.setPartial({state: 'Claimed'});
        } catch (e) {
          this.setPartial({error: formatError(e)});
          console.error(e);
        }
      }
    }
  }
}

export default new TokenClaimStore(wallet, chain);
