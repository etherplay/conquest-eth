import {BigNumber} from 'ethers';
import fs from 'fs';

const tokendue = JSON.parse(fs.readFileSync('./data/tokendue.json', 'utf-8'));

const list = [];
let total = 0;
const addresses = Object.keys(tokendue);
for (const address of addresses) {
  const obj = tokendue[address];
  const amount = obj.numTokens;

  list.push({address, amount: BigNumber.from(amount).mul('1000000000000000000')});
  total += amount;
}

console.log({total});
