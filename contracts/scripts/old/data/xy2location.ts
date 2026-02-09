import {xyToLocation} from 'conquest-eth-common';
import {BigNumber} from 'ethers';

const args = process.argv.slice(2);

console.log(args);

const location = xyToLocation(parseInt(args[0], 10), parseInt(args[1], 10));
console.log(location);
console.log(BigNumber.from(location).toString());
