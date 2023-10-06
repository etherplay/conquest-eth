import {locationToXY} from 'conquest-eth-common';
import {BigNumber} from 'ethers';

const args = process.argv.slice(2);
const location = BigNumber.from(args[0]).toHexString();

const xy = locationToXY(location);

console.log(xy);
