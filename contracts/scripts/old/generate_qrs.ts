import {HardhatRuntimeEnvironment} from 'hardhat/types';
import hre from 'hardhat';
import {Wallet} from '@ethersproject/wallet';
import qrcode from 'qrcode';
import fs from 'fs';

const args = process.argv.slice(2);

if (args.length === 0) {
  throw new Error(`need to pass the number of claim keys to generate`);
}
const numQR = parseInt(args[0]);
if (isNaN(numQR) || numQR === 0 || numQR > 240) {
  throw new Error(`invalid number of QR`);
}
const offset = 0;

let mainURL = `https://${hre.network.name}.conquest.etherplay.io/`;

if (!mainURL.endsWith('/')) {
  mainURL = mainURL + '/';
}

async function func(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {network} = hre;

  let mnemonic = 'curious erupt response napkin sick ketchup hard estate comic club female sudden';
  // TODO check hardhat-deploy: if (network.live) {
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    mnemonic = Wallet.createRandom().mnemonic.phrase;
  }

  const qrs: string[] = [];
  for (let i = offset; i < numQR + offset; i++) {
    const path = "m/44'/60'/" + i + "'/0/0";
    const wallet = Wallet.fromMnemonic(mnemonic, path);

    const url = `${mainURL}#tokenClaim=${wallet.privateKey}`;
    const qr = await qrcode.toDataURL(url);
    qrs.push(qr);
  }

  const filename = `../web/src/qrs.json`;
  fs.writeFileSync(filename, JSON.stringify(qrs));
}

async function main() {
  await func(hre);
}

if (require.main === module) {
  main();
}
