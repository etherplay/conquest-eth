import {locationToXY} from 'conquest-eth-common';
import {BigNumber} from 'ethers';

const {x, y} = locationToXY(
	BigNumber.from('23139200950623815515509473305360238378933').toHexString(),
);

console.log({x, y});
