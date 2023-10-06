import {xyToLocation} from 'conquest-eth-common';
import {BigNumber} from 'ethers';

const args = process.argv.slice(2);
const coords = args[0] || '-4,85';

const [x, y] = coords.split(',').map((v) => parseInt(v));

const location = xyToLocation(x, y);

const bn = BigNumber.from(location);

console.log({
  decimal: bn.toString(),
  hex: location,
});
