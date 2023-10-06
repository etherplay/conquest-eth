import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {Wallet} from '@ethersproject/wallet';
import fs from 'fs';
import qrcode from 'qrcode';

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error(`need to pass the number of claim keys to generate`);
}
const numClaimKey = parseInt(args[0]);
if (isNaN(numClaimKey) || numClaimKey === 0 || numClaimKey > 100) {
  throw new Error(`invalid number of claims`);
}
const offset = 0;

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {network, getChainId} = hre;

  const mnemonic = 'TODO';
  const claimKeys = [];
  for (let i = offset; i < numClaimKey + offset; i++) {
    const path = "m/44'/60'/" + i + "'/0/0";
    const wallet = Wallet.fromMnemonic(mnemonic, path);
    claimKeys.push(wallet.privateKey);
  }

  let explorerLink = '';
  let etherscanNetworkPrefix: string | undefined;
  const chainId = await getChainId();
  if (chainId === '1') {
    etherscanNetworkPrefix = '';
  } else if (chainId === '4') {
    etherscanNetworkPrefix = 'rinkeby.';
  } else if (chainId === '42') {
    etherscanNetworkPrefix = 'kovan.';
  } else if (chainId === '5') {
    etherscanNetworkPrefix = 'goerli.';
  } // TODO more
  if (etherscanNetworkPrefix !== undefined) {
    explorerLink = `https://${etherscanNetworkPrefix}etherscan.io/address/`;
  }
  let csv = 'used,address,key,url,qrURL\n';
  for (const claimKey of claimKeys) {
    const url = 'https://conquest.eth.link/#tokenClaim=' + claimKey;
    const qrURL = await qrcode.toDataURL(url);
    const address = new Wallet(claimKey).address;
    csv += `false,${explorerLink}${address},${claimKey},${url},"${qrURL}"\n`;
  }
  fs.writeFileSync(`.${network.name}.claimKeys.csv.test`, csv);
}
if (require.main === module) {
  func(hre);
}
